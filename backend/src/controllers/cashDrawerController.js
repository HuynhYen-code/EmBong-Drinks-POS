const db = require('../config/db');
const { getVietnamDateStr } = require('./../utils/dateHelper');

const ROLLOVER_CUTOFF_DATE = '2026-11-06';

async function resolveInitialCashForDate(dateStr) {
    const [cashRows] = await db.query(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, initial_cash, is_manual_initial, actual_ending_cash, notes
         FROM daily_cash
         WHERE date = ?`,
        [dateStr]
    );

    const currentRow = cashRows.length > 0 ? cashRows[0] : null;

    // Nếu người dùng đã chủ động nhập tay tiền đầu ngày cho ngày này -> ưu tiên số nhập tay
    if (currentRow && Number(currentRow.is_manual_initial) === 1) {
        return {
            initialCash: parseFloat(currentRow.initial_cash) || 0,
            isAutoRollover: false,
            rolloverFromDate: null,
            currentRow
        };
    }

    // Ngược lại: tự động lấy tiền kết két của ngày trước chuyển sang đầu ngày hôm nay
    const [anchorRows] = await db.query(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, initial_cash, is_manual_initial, actual_ending_cash
         FROM daily_cash
         WHERE date < ? AND (actual_ending_cash IS NOT NULL OR is_manual_initial = 1)
         ORDER BY date DESC
         LIMIT 1`,
        [dateStr]
    );

    let baseAmount = 0;
    let flowStartDate = null;
    let rolloverFromDate = null;

    if (anchorRows.length > 0) {
        const anchor = anchorRows[0];
        rolloverFromDate = anchor.date_str;

        if (anchor.actual_ending_cash !== null && anchor.actual_ending_cash !== undefined) {
            // Ngày neo đã chốt két thực tế -> lấy số thực tế cuối ngày đó, chỉ cộng dòng tiền các ngày SAU ngày neo
            baseAmount = parseFloat(anchor.actual_ending_cash) || 0;
            const nextDay = new Date(`${anchor.date_str}T00:00:00Z`);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            flowStartDate = nextDay.toISOString().slice(0, 10);
        } else {
            // Ngày neo mới chỉ nhập đầu ngày, chưa bấm chốt két -> cộng dòng tiền TỪ chính ngày neo đến trước dateStr
            baseAmount = parseFloat(anchor.initial_cash) || 0;
            flowStartDate = anchor.date_str;
        }
    } else if (dateStr > ROLLOVER_CUTOFF_DATE) {
        flowStartDate = ROLLOVER_CUTOFF_DATE;
        const prev = new Date(`${dateStr}T00:00:00Z`);
        prev.setUTCDate(prev.getUTCDate() - 1);
        rolloverFromDate = prev.toISOString().slice(0, 10);
    } else {
        return {
            initialCash: 0,
            isAutoRollover: false,
            rolloverFromDate: null,
            currentRow
        };
    }

    let deltaCash = 0;
    if (flowStartDate && flowStartDate < dateStr) {
        const [[salesRows], [expRows]] = await Promise.all([
            db.query(
                `SELECT COALESCE(SUM(total_amount), 0) as cash_sales
                 FROM orders
                 WHERE payment_method = 'cash'
                   AND created_at >= CONCAT(?, ' 00:00:00')
                   AND created_at < CONCAT(?, ' 00:00:00')`,
                [flowStartDate, dateStr]
            ),
            db.query(
                `SELECT COALESCE(SUM(amount), 0) as total_exp
                 FROM expenses
                 WHERE date >= ? AND date < ?`,
                [flowStartDate, dateStr]
            )
        ]);
        deltaCash = (parseFloat(salesRows[0].cash_sales) || 0) - (parseFloat(expRows[0].total_exp) || 0);
    }

    return {
        initialCash: baseAmount + deltaCash,
        isAutoRollover: true,
        rolloverFromDate,
        currentRow
    };
}

// Lấy thông tin két tiền và tổng kết dòng tiền trong ngày
exports.getSummary = async (req, res) => {
    const dateStr = req.query.date || getVietnamDateStr();

    try {
        const [resolved, [orderStats], [expenses]] = await Promise.all([
            resolveInitialCashForDate(dateStr),
            db.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_revenue,
                    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) as transfer_revenue,
                    COALESCE(SUM(total_amount), 0) as total_revenue,
                    COUNT(id) as total_orders
                FROM orders
                WHERE created_at >= CONCAT(?, ' 00:00:00')
                  AND created_at <= CONCAT(?, ' 23:59:59')
            `, [dateStr, dateStr]),
            db.query(
                'SELECT id, DATE_FORMAT(date, "%Y-%m-%d") as date, category, amount, description, DATE_FORMAT(created_at, "%H:%i:%s") as time FROM expenses WHERE date = ? ORDER BY id DESC',
                [dateStr]
            )
        ]);

        const initialCash = resolved.initialCash;
        const currentRow = resolved.currentRow;
        const actualEndingCash = currentRow && currentRow.actual_ending_cash !== null
            ? parseFloat(currentRow.actual_ending_cash)
            : null;
        const notes = currentRow ? (currentRow.notes || '') : '';

        const cashRevenue = parseFloat(orderStats[0].cash_revenue) || 0;
        const transferRevenue = parseFloat(orderStats[0].transfer_revenue) || 0;
        const totalRevenue = parseFloat(orderStats[0].total_revenue) || 0;
        const totalOrders = parseInt(orderStats[0].total_orders) || 0;

        const totalExpenses = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        const expectedEndingCash = initialCash + cashRevenue - totalExpenses;
        const difference = actualEndingCash !== null ? (actualEndingCash - expectedEndingCash) : null;

        res.json({
            date: dateStr,
            initial_cash: initialCash,
            is_auto_rollover: resolved.isAutoRollover,
            rollover_from_date: resolved.rolloverFromDate,
            cash_revenue: cashRevenue,
            transfer_revenue: transferRevenue,
            total_revenue: totalRevenue,
            total_orders: totalOrders,
            total_expenses: totalExpenses,
            expected_ending_cash: expectedEndingCash,
            actual_ending_cash: actualEndingCash,
            difference,
            notes,
            expenses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Cập nhật số tiền trong két đầu ngày (hoặc đặt lại chế độ tự động chuyển tiếp từ hôm trước)
exports.setInitialCash = async (req, res) => {
    const { date, initial_cash, reset_auto } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        if (reset_auto) {
            await db.query(
                `INSERT INTO daily_cash (date, initial_cash, is_manual_initial)
                 VALUES (?, 0, 0)
                 ON DUPLICATE KEY UPDATE initial_cash = 0, is_manual_initial = 0`,
                [date]
            );
            const resolved = await resolveInitialCashForDate(date);
            return res.json({
                message: 'Đã chuyển về chế độ tự động lấy tiền kết két hôm trước',
                initial_cash: resolved.initialCash,
                is_auto_rollover: resolved.isAutoRollover
            });
        }

        const amount = parseFloat(initial_cash) || 0;
        await db.query(`
            INSERT INTO daily_cash (date, initial_cash, is_manual_initial)
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE initial_cash = VALUES(initial_cash), is_manual_initial = 1
        `, [date, amount]);

        res.json({ message: 'Cập nhật tiền két đầu ngày thành công', initial_cash: amount, is_auto_rollover: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Chốt két cuối ngày / kết ca
exports.closeShift = async (req, res) => {
    const { date, actual_ending_cash, notes } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        const actual = actual_ending_cash !== null && actual_ending_cash !== undefined && actual_ending_cash !== ''
            ? parseFloat(actual_ending_cash)
            : null;

        await db.query(`
            INSERT INTO daily_cash (date, actual_ending_cash, notes)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                actual_ending_cash = VALUES(actual_ending_cash),
                notes = VALUES(notes)
        `, [date, actual, notes || '']);

        res.json({ message: 'Chốt két thành công! Số tiền này sẽ tự động chuyển làm tiền đầu ngày hôm sau.', actual_ending_cash: actual });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resolveInitialCashForDate = resolveInitialCashForDate;
