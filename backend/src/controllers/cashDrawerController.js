const db = require('../config/db');

// Lấy thông tin két tiền và tổng kết dòng tiền trong ngày
exports.getSummary = async (req, res) => {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    
    try {
        // 1. Lấy thông tin cấu hình két trong ngày (tiền đầu ngày, tiền chốt kết ca)
        const [cashRows] = await db.query(
            'SELECT initial_cash, actual_ending_cash, notes FROM daily_cash WHERE date = ?',
            [dateStr]
        );
        const initialCash = cashRows.length > 0 ? parseFloat(cashRows[0].initial_cash) : 0;
        const actualEndingCash = cashRows.length > 0 && cashRows[0].actual_ending_cash !== null 
            ? parseFloat(cashRows[0].actual_ending_cash) 
            : null;
        const notes = cashRows.length > 0 ? (cashRows[0].notes || '') : '';

        // 2. Lấy doanh thu tiền mặt và chuyển khoản từ bảng orders
        const [orderStats] = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_revenue,
                COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) as transfer_revenue,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(id) as total_orders
            FROM orders
            WHERE DATE(created_at) = ?
        `, [dateStr]);

        const cashRevenue = parseFloat(orderStats[0].cash_revenue) || 0;
        const transferRevenue = parseFloat(orderStats[0].transfer_revenue) || 0;
        const totalRevenue = parseFloat(orderStats[0].total_revenue) || 0;
        const totalOrders = parseInt(orderStats[0].total_orders) || 0;

        // 3. Lấy danh sách các khoản chi lấy từ két trong ngày
        const [expenses] = await db.query(
            'SELECT id, date, category, amount, description, DATE_FORMAT(created_at, "%H:%i:%s") as time FROM expenses WHERE date = ? ORDER BY id DESC',
            [dateStr]
        );
        
        const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);

        // 4. Tính toán tiền trong két kết ca (Lý thuyết)
        // Tiền kết ca lý thuyết = Tiền đầu ngày + Tiền mặt bán được - Tiền chi
        const expectedEndingCash = initialCash + cashRevenue - totalExpenses;
        const difference = actualEndingCash !== null ? (actualEndingCash - expectedEndingCash) : null;

        res.json({
            date: dateStr,
            initial_cash: initialCash,
            cash_revenue: cashRevenue,
            transfer_revenue: transferRevenue,
            total_revenue: totalRevenue,
            total_orders: totalOrders,
            total_expenses: totalExpenses,
            expected_ending_cash: expectedEndingCash,
            actual_ending_cash: actualEndingCash,
            difference: difference,
            notes: notes,
            expenses: expenses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Cập nhật số tiền trong két đầu ngày
exports.setInitialCash = async (req, res) => {
    const { date, initial_cash } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        const amount = parseFloat(initial_cash) || 0;
        await db.query(`
            INSERT INTO daily_cash (date, initial_cash)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE initial_cash = VALUES(initial_cash)
        `, [date, amount]);

        res.json({ message: 'Cập nhật tiền két đầu ngày thành công', initial_cash: amount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Chốt két cuối ngày / kết ca
exports.closeShift = async (req, res) => {
    const { date, actual_ending_cash, notes } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        const actual = actual_ending_cash !== null && actual_ending_cash !== undefined 
            ? parseFloat(actual_ending_cash) 
            : null;

        await db.query(`
            INSERT INTO daily_cash (date, actual_ending_cash, notes)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                actual_ending_cash = VALUES(actual_ending_cash),
                notes = VALUES(notes)
        `, [date, actual, notes || '']);

        res.json({ message: 'Chốt két thành công', actual_ending_cash: actual });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
