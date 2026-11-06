const db = require('../config/db');
const { STYLES, buildXlsxWorkbook } = require('../utils/excelBuilder');
const {
    getVietnamDateStr,
    getVietnamMonthStr,
    getVietnamDateTimeDisplay,
    getMonthDateRange
} = require('../utils/dateHelper');

const ROLLOVER_CUTOFF_DATE = '2026-11-06';

exports.create = async (req, res) => {
    const { cart_items, payment_method, discount_amount, order_note } = req.body;

    if (!Array.isArray(cart_items) || cart_items.length === 0) {
        return res.status(400).json({ error: 'Giỏ hàng đang trống!' });
    }

    const validPaymentMethod = payment_method === 'transfer' ? 'transfer' : 'cash';

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Gom danh sách ID món & topping để truy vấn 1 lần (tránh N+1 queries giờ cao điểm)
        const itemIds = [...new Set(cart_items.map(i => i.id).filter(Boolean))];
        const toppingIds = [
            ...new Set(
                cart_items.flatMap(i => (Array.isArray(i.toppings) ? i.toppings.map(t => t.id) : [])).filter(Boolean)
            )
        ];

        const [sizeRows] = itemIds.length > 0
            ? await connection.query(
                'SELECT menu_item_id, size_name, price, current_cogs FROM menu_item_sizes WHERE menu_item_id IN (?)',
                [itemIds]
            )
            : [[]];

        const [toppingRows] = toppingIds.length > 0
            ? await connection.query(
                'SELECT id, price, current_cogs FROM toppings WHERE id IN (?)',
                [toppingIds]
            )
            : [[]];

        const sizeMap = {};
        for (const s of sizeRows) {
            sizeMap[`${s.menu_item_id}__${s.size_name}`] = {
                price: parseFloat(s.price) || 0,
                cogs: parseFloat(s.current_cogs) || 0
            };
        }

        const toppingMap = {};
        for (const t of toppingRows) {
            toppingMap[t.id] = {
                price: parseFloat(t.price) || 0,
                cogs: parseFloat(t.current_cogs) || 0
            };
        }

        let subtotalAmount = 0;
        let totalCogs = 0;
        const details = [];
        const detailsToppings = [];

        for (const item of cart_items) {
            const cupQty = Math.max(1, parseInt(item.quantity, 10) || 1);
            const sizeInfo = sizeMap[`${item.id}__${item.size}`];
            if (!sizeInfo) {
                throw new Error(`Không tìm thấy size "${item.size}" cho món ID ${item.id}`);
            }

            const unitPrice = sizeInfo.price;
            const unitCogs = sizeInfo.cogs;

            let itemTotalAmount = unitPrice * cupQty;
            let itemTotalCogs = unitCogs * cupQty;

            const detIndex = details.length;
            details.push({
                menu_item_id: item.id,
                size_name: item.size,
                quantity: cupQty,
                unit_price: unitPrice,
                unit_cogs: unitCogs,
                note: item.note ? String(item.note).trim().slice(0, 255) : null
            });

            if (Array.isArray(item.toppings) && item.toppings.length > 0) {
                for (const t of item.toppings) {
                    const topInfo = toppingMap[t.id];
                    const perCupQty = Math.max(1, parseInt(t.quantity, 10) || 1);
                    if (topInfo && perCupQty > 0) {
                        const totalTopPortions = perCupQty * cupQty;
                        itemTotalAmount += topInfo.price * totalTopPortions;
                        itemTotalCogs += topInfo.cogs * totalTopPortions;

                        detailsToppings.push({
                            detIndex,
                            topping_id: t.id,
                            quantity: totalTopPortions,
                            unit_price: topInfo.price,
                            unit_cogs: topInfo.cogs
                        });
                    }
                }
            }

            subtotalAmount += itemTotalAmount;
            totalCogs += itemTotalCogs;
        }

        const cleanDiscount = Math.max(0, Math.min(subtotalAmount, parseFloat(discount_amount) || 0));
        const finalTotalAmount = subtotalAmount - cleanDiscount;
        const cleanOrderNote = order_note ? String(order_note).trim().slice(0, 255) : null;

        const [orderResult] = await connection.query(
            `INSERT INTO orders (subtotal_amount, discount_amount, total_amount, total_cogs, payment_method, order_note)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [subtotalAmount, cleanDiscount, finalTotalAmount, totalCogs, validPaymentMethod, cleanOrderNote]
        );
        const orderId = orderResult.insertId;

        const toppingInsertRows = [];
        for (let i = 0; i < details.length; i++) {
            const det = details[i];
            const [detResult] = await connection.query(
                `INSERT INTO order_details (order_id, menu_item_id, size_name, quantity, unit_price, unit_cogs, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [orderId, det.menu_item_id, det.size_name, det.quantity, det.unit_price, det.unit_cogs, det.note]
            );
            const detailId = detResult.insertId;

            const relatedToppings = detailsToppings.filter(dt => dt.detIndex === i);
            for (const rt of relatedToppings) {
                toppingInsertRows.push([detailId, rt.topping_id, rt.quantity, rt.unit_price, rt.unit_cogs]);
            }
        }

        if (toppingInsertRows.length > 0) {
            await connection.query(
                'INSERT INTO order_detail_toppings (order_detail_id, topping_id, quantity, unit_price, unit_cogs) VALUES ?',
                [toppingInsertRows]
            );
        }

        await connection.commit();
        connection.release();

        res.status(201).json({
            id: orderId,
            subtotal_amount: subtotalAmount,
            discount_amount: cleanDiscount,
            total_amount: finalTotalAmount,
            payment_method: validPaymentMethod,
            message: 'Thanh toán đơn hàng thành công'
        });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.getStats = async (req, res) => {
    const selectedDate = req.query.date || getVietnamDateStr();
    const targetMonth = req.query.month || selectedDate.slice(0, 7) || getVietnamMonthStr();
    const monthRange = getMonthDateRange(targetMonth);

    const dayStart = `${selectedDate} 00:00:00`;
    const dayEnd = `${selectedDate} 23:59:59`;

    try {
        // Chạy song song toàn bộ truy vấn thống kê để tải trang cực nhanh
        const [
            [dayStatsRows],
            [dayCupsRows],
            [dailyRev],
            [dailyCups],
            [monthStats],
            [monthCupsData],
            [monthExpensesData],
            [dateItemsRows],
            [monthItemsRows],
            [topItems]
        ] = await Promise.all([
            db.query(`
                SELECT 
                    COUNT(id) as total_orders,
                    COALESCE(SUM(total_amount), 0) as revenue,
                    COALESCE(SUM(discount_amount), 0) as discount,
                    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) as transfer_revenue,
                    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN 0 ELSE total_amount END), 0) as cash_revenue,
                    COALESCE(SUM(total_cogs), 0) as cogs,
                    (COALESCE(SUM(total_amount), 0) - COALESCE(SUM(total_cogs), 0)) as profit
                FROM orders
                WHERE created_at >= ? AND created_at <= ?
            `, [dayStart, dayEnd]),

            db.query(`
                SELECT COALESCE(SUM(od.quantity), 0) as cups
                FROM order_details od
                JOIN orders o ON od.order_id = o.id
                WHERE o.created_at >= ? AND o.created_at <= ?
            `, [dayStart, dayEnd]),

            db.query(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                    COUNT(id) as total_orders,
                    SUM(total_amount) as revenue,
                    SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END) as transfer_revenue,
                    SUM(CASE WHEN payment_method = 'transfer' THEN 0 ELSE total_amount END) as cash_revenue,
                    SUM(total_cogs) as cogs,
                    (SUM(total_amount) - SUM(total_cogs)) as profit
                FROM orders
                GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
                ORDER BY date DESC
                LIMIT 30
            `),

            db.query(`
                SELECT 
                    DATE_FORMAT(o.created_at, '%Y-%m-%d') as date,
                    SUM(od.quantity) as cups
                FROM order_details od
                JOIN orders o ON od.order_id = o.id
                GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
                ORDER BY date DESC
                LIMIT 30
            `),

            db.query(`
                SELECT 
                    COUNT(id) as total_orders,
                    COALESCE(SUM(total_amount), 0) as month_revenue,
                    COALESCE(SUM(discount_amount), 0) as month_discount,
                    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) as month_transfer_revenue,
                    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN 0 ELSE total_amount END), 0) as month_cash_revenue,
                    COALESCE(SUM(total_cogs), 0) as month_cogs,
                    (COALESCE(SUM(total_amount), 0) - COALESCE(SUM(total_cogs), 0)) as month_profit
                FROM orders
                WHERE created_at >= ? AND created_at <= ?
            `, [monthRange.startDateTime, monthRange.endDateTime]),

            db.query(`
                SELECT COALESCE(SUM(od.quantity), 0) as month_cups
                FROM order_details od
                JOIN orders o ON od.order_id = o.id
                WHERE o.created_at >= ? AND o.created_at <= ?
            `, [monthRange.startDateTime, monthRange.endDateTime]),

            db.query(`
                SELECT COALESCE(SUM(amount), 0) as total_expenses
                FROM expenses
                WHERE date >= ? AND date <= ?
            `, [monthRange.startDate, monthRange.endDate]),

            db.query(`
                SELECT 
                    m.id as menu_item_id,
                    m.name,
                    od.size_name,
                    SUM(od.quantity) as total_sold,
                    SUM(od.unit_price * od.quantity) as total_sales,
                    SUM(od.unit_cogs * od.quantity) as total_cogs
                FROM order_details od
                JOIN menu_items m ON od.menu_item_id = m.id
                JOIN orders o ON od.order_id = o.id
                WHERE o.created_at >= ? AND o.created_at <= ?
                GROUP BY m.id, m.name, od.size_name
                ORDER BY total_sold DESC
            `, [dayStart, dayEnd]),

            db.query(`
                SELECT 
                    m.id as menu_item_id,
                    m.name,
                    od.size_name,
                    SUM(od.quantity) as total_sold,
                    SUM(od.unit_price * od.quantity) as total_sales,
                    SUM(od.unit_cogs * od.quantity) as total_cogs
                FROM order_details od
                JOIN menu_items m ON od.menu_item_id = m.id
                JOIN orders o ON od.order_id = o.id
                WHERE o.created_at >= ? AND o.created_at <= ?
                GROUP BY m.id, m.name, od.size_name
                ORDER BY total_sold DESC
            `, [monthRange.startDateTime, monthRange.endDateTime]),

            db.query(`
                SELECT m.name, SUM(od.quantity) as total_sold
                FROM order_details od
                JOIN menu_items m ON od.menu_item_id = m.id
                GROUP BY m.id, m.name
                ORDER BY total_sold DESC
                LIMIT 5
            `)
        ]);

        const selectedDayStats = {
            total_orders: parseInt(dayStatsRows[0].total_orders, 10) || 0,
            revenue: parseFloat(dayStatsRows[0].revenue) || 0,
            discount: parseFloat(dayStatsRows[0].discount) || 0,
            transfer_revenue: parseFloat(dayStatsRows[0].transfer_revenue) || 0,
            cash_revenue: parseFloat(dayStatsRows[0].cash_revenue) || 0,
            cogs: parseFloat(dayStatsRows[0].cogs) || 0,
            profit: parseFloat(dayStatsRows[0].profit) || 0,
            cups: parseInt(dayCupsRows[0].cups, 10) || 0
        };

        const cupsMap = {};
        dailyCups.forEach(row => {
            cupsMap[row.date] = parseInt(row.cups, 10) || 0;
        });

        const revenue30Days = dailyRev.map(row => ({
            date: row.date,
            total_orders: parseInt(row.total_orders, 10) || 0,
            revenue: parseFloat(row.revenue) || 0,
            transfer_revenue: parseFloat(row.transfer_revenue) || 0,
            cash_revenue: parseFloat(row.cash_revenue) || 0,
            cogs: parseFloat(row.cogs) || 0,
            profit: parseFloat(row.profit) || 0,
            cups: cupsMap[row.date] || 0
        }));

        res.json({
            selected_day: selectedDayStats,
            revenue: revenue30Days,
            selected_month: monthRange.month,
            this_month: {
                month: monthRange.month,
                total_orders: parseInt(monthStats[0].total_orders, 10) || 0,
                revenue: parseFloat(monthStats[0].month_revenue) || 0,
                discount: parseFloat(monthStats[0].month_discount) || 0,
                cash_revenue: parseFloat(monthStats[0].month_cash_revenue) || 0,
                transfer_revenue: parseFloat(monthStats[0].month_transfer_revenue) || 0,
                cogs: parseFloat(monthStats[0].month_cogs) || 0,
                profit: parseFloat(monthStats[0].month_profit) || 0,
                expenses: parseFloat(monthExpensesData[0].total_expenses) || 0,
                cups: parseInt(monthCupsData[0].month_cups, 10) || 0
            },
            top_items: topItems,
            date_items_breakdown: dateItemsRows.map(r => ({
                id: r.menu_item_id,
                name: r.name,
                size_name: r.size_name,
                total_sold: parseInt(r.total_sold, 10) || 0,
                total_sales: parseFloat(r.total_sales) || 0,
                total_cogs: parseFloat(r.total_cogs) || 0
            })),
            month_items_breakdown: monthItemsRows.map(r => ({
                id: r.menu_item_id,
                name: r.name,
                size_name: r.size_name,
                total_sold: parseInt(r.total_sold, 10) || 0,
                total_sales: parseFloat(r.total_sales) || 0,
                total_cogs: parseFloat(r.total_cogs) || 0
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDailyHistory = async (req, res) => {
    const dateStr = req.query.date;
    if (!dateStr) return res.status(400).json({ error: 'Date is required' });

    const dayStart = `${dateStr} 00:00:00`;
    const dayEnd = `${dateStr} 23:59:59`;

    try {
        const [[orders], [details], [toppings]] = await Promise.all([
            db.query(`
                SELECT id, subtotal_amount, discount_amount, total_amount, total_cogs, payment_method, order_note,
                       DATE_FORMAT(created_at, '%H:%i:%s') as time
                FROM orders
                WHERE created_at >= ? AND created_at <= ?
                ORDER BY created_at DESC
            `, [dayStart, dayEnd]),

            db.query(`
                SELECT od.id as order_detail_id, od.order_id, m.name, od.size_name, od.quantity, od.unit_price, od.note
                FROM order_details od
                JOIN menu_items m ON od.menu_item_id = m.id
                JOIN orders o ON od.order_id = o.id
                WHERE o.created_at >= ? AND o.created_at <= ?
            `, [dayStart, dayEnd]),

            db.query(`
                SELECT od.order_id, od.id as od_id, t.name, odt.quantity, odt.unit_price
                FROM order_detail_toppings odt
                JOIN toppings t ON odt.topping_id = t.id
                JOIN order_details od ON odt.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                WHERE o.created_at >= ? AND o.created_at <= ?
            `, [dayStart, dayEnd])
        ]);

        const toppingsByDetail = {};
        for (const t of toppings) {
            if (!toppingsByDetail[t.od_id]) toppingsByDetail[t.od_id] = [];
            toppingsByDetail[t.od_id].push(t);
        }

        const detailsByOrder = {};
        for (const d of details) {
            if (!detailsByOrder[d.order_id]) detailsByOrder[d.order_id] = [];
            const cupQty = Math.max(1, parseInt(d.quantity, 10) || 1);
            const itemToppings = (toppingsByDetail[d.order_detail_id] || []).map(t => {
                const totalTopQty = parseInt(t.quantity, 10) || cupQty;
                return {
                    ...t,
                    quantity: totalTopQty,
                    per_cup_qty: Math.max(1, Math.round(totalTopQty / cupQty))
                };
            });
            detailsByOrder[d.order_id].push({
                ...d,
                toppings: itemToppings
            });
        }

        const history = orders.map(o => ({
            id: o.id,
            time: o.time,
            subtotal_amount: o.subtotal_amount !== null ? parseFloat(o.subtotal_amount) : parseFloat(o.total_amount),
            discount_amount: parseFloat(o.discount_amount) || 0,
            total_amount: parseFloat(o.total_amount) || 0,
            order_note: o.order_note || '',
            payment_method: o.payment_method || 'cash',
            items: detailsByOrder[o.id] || []
        }));

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Xuất báo cáo Excel (.xlsx) chi tiết toàn diện theo tháng
exports.exportMonthlyExcel = async (req, res) => {
    const monthParam = req.query.month || getVietnamMonthStr();
    const range = getMonthDateRange(monthParam);
    const [yyyy, mm] = range.month.split('-');
    const todayStr = getVietnamDateStr();

    try {
        const [
            [orders],
            [details],
            [toppings],
            [expenses],
            [dailyCashRows],
            [priorAnchorRows]
        ] = await Promise.all([
            db.query(`
                SELECT id, subtotal_amount, discount_amount, total_amount, total_cogs, payment_method, order_note,
                       DATE_FORMAT(created_at, '%Y-%m-%d') as date_str,
                       DATE_FORMAT(created_at, '%H:%i:%s') as time_str
                FROM orders
                WHERE created_at >= ? AND created_at <= ?
                ORDER BY created_at ASC
            `, [range.startDateTime, range.endDateTime]),

            db.query(`
                SELECT od.id as order_detail_id, od.order_id, od.menu_item_id, m.name, m.category,
                       od.size_name, od.quantity, od.unit_price, od.unit_cogs, od.note
                FROM order_details od
                JOIN menu_items m ON od.menu_item_id = m.id
                JOIN orders o ON od.order_id = o.id
                WHERE o.created_at >= ? AND o.created_at <= ?
                ORDER BY od.id ASC
            `, [range.startDateTime, range.endDateTime]),

            db.query(`
                SELECT odt.order_detail_id, od.order_id, odt.topping_id, t.name,
                       odt.quantity, odt.unit_price, odt.unit_cogs
                FROM order_detail_toppings odt
                JOIN toppings t ON odt.topping_id = t.id
                JOIN order_details od ON odt.order_detail_id = od.id
                JOIN orders o ON od.order_id = o.id
                WHERE o.created_at >= ? AND o.created_at <= ?
            `, [range.startDateTime, range.endDateTime]),

            db.query(`
                SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date_str, category, amount, description,
                       DATE_FORMAT(created_at, '%H:%i:%s') as time_str
                FROM expenses
                WHERE date >= ? AND date <= ?
                ORDER BY date ASC, id ASC
            `, [range.startDate, range.endDate]),

            db.query(`
                SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, initial_cash, is_manual_initial, actual_ending_cash, notes
                FROM daily_cash
                WHERE date >= ? AND date <= ?
            `, [range.startDate, range.endDate]),

            db.query(`
                SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, initial_cash, is_manual_initial, actual_ending_cash
                FROM daily_cash
                WHERE date < ? AND (actual_ending_cash IS NOT NULL OR is_manual_initial = 1)
                ORDER BY date DESC
                LIMIT 1
            `, [range.startDate])
        ]);

        // Tính tiền kết két chuyển sang đầu tháng (nếu có)
        let runningCarryOver = 0;
        let hasPriorCarryAnchor = false;
        let priorFlowStart = null;
        let priorBase = 0;

        if (priorAnchorRows.length > 0) {
            const anchor = priorAnchorRows[0];
            hasPriorCarryAnchor = true;
            if (anchor.actual_ending_cash !== null && anchor.actual_ending_cash !== undefined) {
                priorBase = parseFloat(anchor.actual_ending_cash) || 0;
                const nextDay = new Date(`${anchor.date_str}T00:00:00Z`);
                nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                priorFlowStart = nextDay.toISOString().slice(0, 10);
            } else {
                priorBase = parseFloat(anchor.initial_cash) || 0;
                priorFlowStart = anchor.date_str;
            }
        } else if (range.startDate > ROLLOVER_CUTOFF_DATE) {
            hasPriorCarryAnchor = true;
            priorFlowStart = ROLLOVER_CUTOFF_DATE;
        }

        if (priorFlowStart && priorFlowStart < range.startDate) {
            const [[pSales], [pExp]] = await Promise.all([
                db.query(
                    `SELECT COALESCE(SUM(total_amount), 0) as s
                     FROM orders
                     WHERE payment_method = 'cash'
                       AND created_at >= CONCAT(?, ' 00:00:00')
                       AND created_at < CONCAT(?, ' 00:00:00')`,
                    [priorFlowStart, range.startDate]
                ),
                db.query(
                    `SELECT COALESCE(SUM(amount), 0) as e
                     FROM expenses
                     WHERE date >= ? AND date < ?`,
                    [priorFlowStart, range.startDate]
                )
            ]);
            runningCarryOver = priorBase + (parseFloat(pSales[0].s) || 0) - (parseFloat(pExp[0].e) || 0);
        } else {
            runningCarryOver = priorBase;
        }

        const formatVNDate = (dStr) => {
            const [y, m, d] = dStr.split('-');
            return `${d}/${m}/${y}`;
        };

        // Gom dữ liệu chi tiết theo đơn, theo ngày, theo món, theo topping
        const toppingsByDetail = {};
        const toppingAgg = {};
        for (const t of toppings) {
            if (!toppingsByDetail[t.order_detail_id]) toppingsByDetail[t.order_detail_id] = [];
            toppingsByDetail[t.order_detail_id].push(t);

            if (!toppingAgg[t.topping_id]) {
                toppingAgg[t.topping_id] = {
                    name: t.name,
                    qty: 0,
                    sales: 0,
                    cogs: 0
                };
            }
            const q = parseInt(t.quantity, 10) || 0;
            toppingAgg[t.topping_id].qty += q;
            toppingAgg[t.topping_id].sales += q * (parseFloat(t.unit_price) || 0);
            toppingAgg[t.topping_id].cogs += q * (parseFloat(t.unit_cogs) || 0);
        }

        const detailsByOrder = {};
        const itemAgg = {};
        let totalCupsMonth = 0;

        for (const d of details) {
            if (!detailsByOrder[d.order_id]) detailsByOrder[d.order_id] = [];
            detailsByOrder[d.order_id].push(d);

            const q = parseInt(d.quantity, 10) || 0;
            totalCupsMonth += q;

            const key = `${d.menu_item_id}__${d.size_name}`;
            if (!itemAgg[key]) {
                itemAgg[key] = {
                    category: d.category || 'Khác',
                    name: d.name,
                    size: d.size_name,
                    qty: 0,
                    sales: 0,
                    cogs: 0
                };
            }
            itemAgg[key].qty += q;
            itemAgg[key].sales += q * (parseFloat(d.unit_price) || 0);
            itemAgg[key].cogs += q * (parseFloat(d.unit_cogs) || 0);
        }

        const ordersByDate = {};
        let totalOrdersMonth = orders.length;
        let totalSubtotalMonth = 0;
        let totalDiscountMonth = 0;
        let totalRevenueMonth = 0;
        let totalCashRevenueMonth = 0;
        let totalTransferRevenueMonth = 0;
        let totalCogsMonth = 0;

        for (const o of orders) {
            if (!ordersByDate[o.date_str]) ordersByDate[o.date_str] = [];
            ordersByDate[o.date_str].push(o);

            const rev = parseFloat(o.total_amount) || 0;
            const disc = parseFloat(o.discount_amount) || 0;
            const sub = o.subtotal_amount !== null ? (parseFloat(o.subtotal_amount) || rev) : (rev + disc);
            const cg = parseFloat(o.total_cogs) || 0;

            totalSubtotalMonth += sub;
            totalDiscountMonth += disc;
            totalRevenueMonth += rev;
            totalCogsMonth += cg;
            if (o.payment_method === 'transfer') {
                totalTransferRevenueMonth += rev;
            } else {
                totalCashRevenueMonth += rev;
            }
        }

        const expensesByDate = {};
        const expensesByCat = {};
        let totalExpensesMonth = 0;
        for (const ex of expenses) {
            if (!expensesByDate[ex.date_str]) expensesByDate[ex.date_str] = [];
            expensesByDate[ex.date_str].push(ex);
            const amt = parseFloat(ex.amount) || 0;
            totalExpensesMonth += amt;
            expensesByCat[ex.category] = (expensesByCat[ex.category] || 0) + amt;
        }

        const cashByDate = {};
        for (const c of dailyCashRows) {
            cashByDate[c.date_str] = c;
        }

        const grossProfitMonth = totalRevenueMonth - totalCogsMonth;
        const netOperatingProfitMonth = grossProfitMonth - totalExpensesMonth;
        const avgOrderValue = totalOrdersMonth > 0 ? Math.round(totalRevenueMonth / totalOrdersMonth) : 0;
        const foodCostRatio = totalRevenueMonth > 0 ? (totalCogsMonth / totalRevenueMonth) : 0;

        const exportTimestamp = getVietnamDateTimeDisplay();

        // =========================================================================
        // SHEET 1: 1. Tổng Quan Tháng
        // =========================================================================
        const sheet1Rows = [
            { height: 30, cells: [{ v: `BÁO CÁO TỔNG QUAN KINH DOANH THÁNG ${mm}/${yyyy} — EM BÔNG`, s: STYLES.TITLE }] },
            { height: 20, cells: [{ v: `Thời điểm xuất báo cáo: ${exportTimestamp} (Múi giờ Việt Nam UTC+7)`, s: STYLES.SUBTITLE }] },
            [],
            {
                height: 24,
                cells: [
                    { v: 'CHỈ TIÊU DOANH THU & LỢI NHUẬN BÁN HÀNG', s: STYLES.HEADER_LEFT },
                    { v: 'GIÁ TRỊ', s: STYLES.HEADER_RIGHT },
                    { v: 'GHI CHÚ / DIỄN GIẢI', s: STYLES.HEADER_LEFT }
                ]
            },
            { cells: [{ v: 'Tổng số đơn hàng đã phục vụ', s: STYLES.TEXT }, { v: totalOrdersMonth, s: STYLES.INT }, { v: 'Tổng số hóa đơn phát sinh trong tháng', s: STYLES.TEXT }] },
            { cells: [{ v: 'Tổng số ly bán ra', s: STYLES.TEXT }, { v: totalCupsMonth, s: STYLES.INT }, { v: 'Tổng số lượng tất cả các món & size', s: STYLES.TEXT }] },
            { cells: [{ v: 'Giá trị đơn hàng trung bình (AOV)', s: STYLES.TEXT }, { v: avgOrderValue, s: STYLES.CURRENCY }, { v: 'Doanh thu thuần / Tổng số đơn', s: STYLES.TEXT }] },
            { cells: [{ v: 'Tổng tiền hàng tạm tính (Trước giảm giá)', s: STYLES.TEXT }, { v: totalSubtotalMonth, s: STYLES.CURRENCY }, { v: 'Bao gồm giá món + topping thêm', s: STYLES.TEXT }] },
            { cells: [{ v: 'Tổng giảm giá / khuyến mãi', s: STYLES.TEXT }, { v: totalDiscountMonth, s: STYLES.CURRENCY }, { v: 'Chiết khấu trực tiếp trên hóa đơn', s: STYLES.TEXT }] },
            { cells: [{ v: 'TỔNG DOANH THU THUẦN (THỰC THU)', s: STYLES.TOTAL_LABEL }, { v: totalRevenueMonth, s: STYLES.TOTAL_CURRENCY }, { v: 'Tiền mặt + Chuyển khoản thực nhận', s: STYLES.TOTAL_LABEL }] },
            { cells: [{ v: '  • Doanh thu Tiền mặt (TM)', s: STYLES.TEXT }, { v: totalCashRevenueMonth, s: STYLES.CURRENCY }, { v: totalRevenueMonth > 0 ? `Chiếm ${((totalCashRevenueMonth / totalRevenueMonth) * 100).toFixed(1)}% doanh thu` : '0%', s: STYLES.TEXT }] },
            { cells: [{ v: '  • Doanh thu Chuyển khoản (CK)', s: STYLES.TEXT }, { v: totalTransferRevenueMonth, s: STYLES.CURRENCY }, { v: totalRevenueMonth > 0 ? `Chiếm ${((totalTransferRevenueMonth / totalRevenueMonth) * 100).toFixed(1)}% doanh thu` : '0%', s: STYLES.TEXT }] },
            { cells: [{ v: 'Tổng giá vốn nguyên liệu & topping (COGS)', s: STYLES.TEXT }, { v: totalCogsMonth, s: STYLES.CURRENCY }, { v: 'Tính theo định mức công thức BOM lúc bán', s: STYLES.TEXT }] },
            { cells: [{ v: 'Tỷ lệ Giá vốn / Doanh thu (Food Cost %)', s: STYLES.TEXT }, { v: foodCostRatio, s: STYLES.PERCENT }, { v: 'Mức chuẩn ngành đồ uống: 25% - 35%', s: STYLES.TEXT }] },
            { cells: [{ v: 'LỢI NHUẬN GỘP BÁN HÀNG (DOANH THU - COGS)', s: STYLES.TOTAL_LABEL }, { v: grossProfitMonth, s: STYLES.TOTAL_CURRENCY }, { v: 'Lợi nhuận trước chi phí mặt bằng & vận hành ngoài', s: STYLES.TOTAL_LABEL }] },
            [],
            {
                height: 24,
                cells: [
                    { v: 'TỔNG HỢP CHI PHÍ KÉT & LỢI NHUẬN RÒNG', s: STYLES.HEADER_LEFT },
                    { v: 'SỐ TIỀN', s: STYLES.HEADER_RIGHT },
                    { v: 'GHI CHÚ', s: STYLES.HEADER_LEFT }
                ]
            },
            { cells: [{ v: 'Tổng các khoản chi tiền mặt từ két trong tháng', s: STYLES.TEXT }, { v: totalExpensesMonth, s: STYLES.CURRENCY }, { v: `${expenses.length} phiếu chi trong tháng`, s: STYLES.TEXT }] }
        ];

        for (const [catName, catAmt] of Object.entries(expensesByCat)) {
            sheet1Rows.push({
                cells: [
                    { v: `  • Chi: ${catName}`, s: STYLES.TEXT },
                    { v: catAmt, s: STYLES.CURRENCY },
                    { v: totalExpensesMonth > 0 ? `${((catAmt / totalExpensesMonth) * 100).toFixed(1)}% tổng chi` : '', s: STYLES.TEXT }
                ]
            });
        }

        sheet1Rows.push({
            height: 24,
            cells: [
                { v: 'LỢI NHUẬN SAU CHI PHÍ RÚT KÉT (LỢI NHUẬN GỘP - CHI KÉT)', s: STYLES.TOTAL_LABEL },
                { v: netOperatingProfitMonth, s: STYLES.TOTAL_CURRENCY },
                { v: 'Lợi nhuận ước tính còn lại trong tháng', s: STYLES.TOTAL_LABEL }
            ]
        });

        // =========================================================================
        // SHEET 2: 2. Theo Ngày (Chi tiết từng ngày trong tháng & Đối soát két)
        // =========================================================================
        const sheet2Rows = [
            { height: 28, cells: [{ v: `BẢNG KÊ DOANH THU, SỐ LY & ĐỐI SOÁT KÉT THEO NGÀY — THÁNG ${mm}/${yyyy}`, s: STYLES.TITLE }] },
            { height: 18, cells: [{ v: 'Bao gồm toàn bộ các ngày trong tháng tính đến hiện tại (tự động tính chuyển tiếp tiền két đầu ngày)', s: STYLES.SUBTITLE }] },
            [],
            {
                height: 26,
                cells: [
                    { v: 'Ngày', s: STYLES.HEADER_CENTER },
                    { v: 'Số đơn', s: STYLES.HEADER_RIGHT },
                    { v: 'Số ly', s: STYLES.HEADER_RIGHT },
                    { v: 'Giảm giá', s: STYLES.HEADER_RIGHT },
                    { v: 'Doanh thu thuần', s: STYLES.HEADER_RIGHT },
                    { v: 'Tiền mặt (TM)', s: STYLES.HEADER_RIGHT },
                    { v: 'Chuyển khoản (CK)', s: STYLES.HEADER_RIGHT },
                    { v: 'Giá vốn (COGS)', s: STYLES.HEADER_RIGHT },
                    { v: 'Lợi nhuận gộp', s: STYLES.HEADER_RIGHT },
                    { v: 'Chi phí két', s: STYLES.HEADER_RIGHT },
                    { v: 'Két đầu ngày', s: STYLES.HEADER_RIGHT },
                    { v: 'Két kết ca (LT)', s: STYLES.HEADER_RIGHT },
                    { v: 'Két thực đếm', s: STYLES.HEADER_RIGHT },
                    { v: 'Lệch két', s: STYLES.HEADER_RIGHT },
                    { v: 'Ghi chú két', s: STYLES.HEADER_LEFT }
                ]
            }
        ];

        for (let day = 1; day <= range.lastDay; day++) {
            const dStr = `${range.month}-${String(day).padStart(2, '0')}`;
            const dayOrders = ordersByDate[dStr] || [];
            const dayExps = expensesByDate[dStr] || [];
            const cRow = cashByDate[dStr] || null;

            // Bỏ qua các ngày tương lai chưa diễn ra nếu không có dữ liệu
            if (dStr > todayStr && dayOrders.length === 0 && dayExps.length === 0 && !cRow) {
                continue;
            }

            let dOrdersCount = dayOrders.length;
            let dCups = 0;
            let dDiscount = 0;
            let dRevenue = 0;
            let dCash = 0;
            let dTransfer = 0;
            let dCogs = 0;

            for (const o of dayOrders) {
                const rev = parseFloat(o.total_amount) || 0;
                dDiscount += parseFloat(o.discount_amount) || 0;
                dRevenue += rev;
                dCogs += parseFloat(o.total_cogs) || 0;
                if (o.payment_method === 'transfer') dTransfer += rev;
                else dCash += rev;

                const oDets = detailsByOrder[o.id] || [];
                for (const od of oDets) dCups += parseInt(od.quantity, 10) || 0;
            }

            const dExpTotal = dayExps.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

            // Tính két đầu ngày & cuối ngày chuẩn logic rollover
            let dInitial = 0;
            if (cRow && Number(cRow.is_manual_initial) === 1) {
                dInitial = parseFloat(cRow.initial_cash) || 0;
                hasPriorCarryAnchor = true;
            } else if (hasPriorCarryAnchor || dStr > ROLLOVER_CUTOFF_DATE) {
                dInitial = runningCarryOver;
            }

            const dExpectedEnding = dInitial + dCash - dExpTotal;
            const dActualEnding = cRow && cRow.actual_ending_cash !== null && cRow.actual_ending_cash !== undefined
                ? parseFloat(cRow.actual_ending_cash)
                : null;
            const dDiff = dActualEnding !== null ? (dActualEnding - dExpectedEnding) : null;

            if (dActualEnding !== null) {
                runningCarryOver = dActualEnding;
                hasPriorCarryAnchor = true;
            } else if (hasPriorCarryAnchor || dStr >= ROLLOVER_CUTOFF_DATE) {
                runningCarryOver = dExpectedEnding;
            }

            sheet2Rows.push({
                cells: [
                    { v: formatVNDate(dStr), s: STYLES.CENTER },
                    { v: dOrdersCount, s: STYLES.INT },
                    { v: dCups, s: STYLES.INT },
                    { v: dDiscount, s: STYLES.CURRENCY },
                    { v: dRevenue, s: STYLES.CURRENCY },
                    { v: dCash, s: STYLES.CURRENCY },
                    { v: dTransfer, s: STYLES.CURRENCY },
                    { v: dCogs, s: STYLES.CURRENCY },
                    { v: dRevenue - dCogs, s: STYLES.CURRENCY },
                    { v: dExpTotal, s: STYLES.CURRENCY },
                    { v: dInitial, s: STYLES.CURRENCY },
                    { v: dExpectedEnding, s: STYLES.CURRENCY },
                    dActualEnding !== null ? { v: dActualEnding, s: STYLES.CURRENCY } : { v: '', s: STYLES.CENTER },
                    dDiff !== null ? { v: dDiff, s: STYLES.CURRENCY } : { v: '', s: STYLES.CENTER },
                    { v: cRow?.notes || '', s: STYLES.TEXT }
                ]
            });
        }

        sheet2Rows.push({
            height: 24,
            cells: [
                { v: 'TỔNG THÁNG', s: STYLES.TOTAL_LABEL },
                { v: totalOrdersMonth, s: STYLES.TOTAL_INT },
                { v: totalCupsMonth, s: STYLES.TOTAL_INT },
                { v: totalDiscountMonth, s: STYLES.TOTAL_CURRENCY },
                { v: totalRevenueMonth, s: STYLES.TOTAL_CURRENCY },
                { v: totalCashRevenueMonth, s: STYLES.TOTAL_CURRENCY },
                { v: totalTransferRevenueMonth, s: STYLES.TOTAL_CURRENCY },
                { v: totalCogsMonth, s: STYLES.TOTAL_CURRENCY },
                { v: grossProfitMonth, s: STYLES.TOTAL_CURRENCY },
                { v: totalExpensesMonth, s: STYLES.TOTAL_CURRENCY },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL }
            ]
        });

        // =========================================================================
        // SHEET 3: 3. Chi Tiết Món & Topping
        // =========================================================================
        const sortedItems = Object.values(itemAgg).sort((a, b) => b.qty - a.qty || b.sales - a.sales);
        const sortedToppings = Object.values(toppingAgg).sort((a, b) => b.qty - a.qty || b.sales - a.sales);

        const sheet3Rows = [
            { height: 28, cells: [{ v: `THỐNG KÊ SỐ LƯỢNG & LỢI NHUẬN TỪNG MÓN / TOPPING — THÁNG ${mm}/${yyyy}`, s: STYLES.TITLE }] },
            [],
            { height: 22, cells: [{ v: 'I. DANH SÁCH MÓN NƯỚC BÁN RA TRONG THÁNG (CHƯA BAO GỒM TOPPING GỌI THÊM)', s: STYLES.SECTION }] },
            {
                height: 25,
                cells: [
                    { v: 'STT', s: STYLES.HEADER_CENTER },
                    { v: 'Phân loại', s: STYLES.HEADER_LEFT },
                    { v: 'Tên món', s: STYLES.HEADER_LEFT },
                    { v: 'Size', s: STYLES.HEADER_CENTER },
                    { v: 'Số ly bán', s: STYLES.HEADER_RIGHT },
                    { v: 'Tỷ trọng ly', s: STYLES.HEADER_RIGHT },
                    { v: 'Doanh thu món', s: STYLES.HEADER_RIGHT },
                    { v: 'Giá vốn (COGS)', s: STYLES.HEADER_RIGHT },
                    { v: 'Lợi nhuận gộp', s: STYLES.HEADER_RIGHT },
                    { v: 'Food Cost %', s: STYLES.HEADER_RIGHT }
                ]
            }
        ];

        let sumItemSales = 0;
        let sumItemCogs = 0;
        sortedItems.forEach((it, idx) => {
            sumItemSales += it.sales;
            sumItemCogs += it.cogs;
            const share = totalCupsMonth > 0 ? it.qty / totalCupsMonth : 0;
            const fc = it.sales > 0 ? it.cogs / it.sales : 0;
            sheet3Rows.push({
                cells: [
                    { v: idx + 1, s: STYLES.CENTER },
                    { v: it.category, s: STYLES.TEXT },
                    { v: it.name, s: STYLES.TEXT },
                    { v: it.size, s: STYLES.CENTER },
                    { v: it.qty, s: STYLES.INT },
                    { v: share, s: STYLES.PERCENT },
                    { v: it.sales, s: STYLES.CURRENCY },
                    { v: it.cogs, s: STYLES.CURRENCY },
                    { v: it.sales - it.cogs, s: STYLES.CURRENCY },
                    { v: fc, s: STYLES.PERCENT }
                ]
            });
        });

        sheet3Rows.push({
            height: 24,
            cells: [
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: 'TỔNG CỘNG MÓN NƯỚC', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: totalCupsMonth, s: STYLES.TOTAL_INT },
                { v: totalCupsMonth > 0 ? 1 : 0, s: STYLES.TOTAL_PERCENT },
                { v: sumItemSales, s: STYLES.TOTAL_CURRENCY },
                { v: sumItemCogs, s: STYLES.TOTAL_CURRENCY },
                { v: sumItemSales - sumItemCogs, s: STYLES.TOTAL_CURRENCY },
                { v: sumItemSales > 0 ? sumItemCogs / sumItemSales : 0, s: STYLES.TOTAL_PERCENT }
            ]
        });

        sheet3Rows.push([], { height: 22, cells: [{ v: 'II. DANH SÁCH TOPPING BÁN KÈM TRONG THÁNG', s: STYLES.SECTION }] });
        sheet3Rows.push({
            height: 25,
            cells: [
                { v: 'STT', s: STYLES.HEADER_CENTER },
                { v: 'Tên Topping', s: STYLES.HEADER_LEFT },
                { v: 'Số phần bán', s: STYLES.HEADER_RIGHT },
                { v: 'Doanh thu Topping', s: STYLES.HEADER_RIGHT },
                { v: 'Giá vốn Topping', s: STYLES.HEADER_RIGHT },
                { v: 'Lợi nhuận Topping', s: STYLES.HEADER_RIGHT }
            ]
        });

        let sumTopQty = 0;
        let sumTopSales = 0;
        let sumTopCogs = 0;
        sortedToppings.forEach((tp, idx) => {
            sumTopQty += tp.qty;
            sumTopSales += tp.sales;
            sumTopCogs += tp.cogs;
            sheet3Rows.push({
                cells: [
                    { v: idx + 1, s: STYLES.CENTER },
                    { v: tp.name, s: STYLES.TEXT },
                    { v: tp.qty, s: STYLES.INT },
                    { v: tp.sales, s: STYLES.CURRENCY },
                    { v: tp.cogs, s: STYLES.CURRENCY },
                    { v: tp.sales - tp.cogs, s: STYLES.CURRENCY }
                ]
            });
        });

        sheet3Rows.push({
            height: 24,
            cells: [
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: 'TỔNG CỘNG TOPPING', s: STYLES.TOTAL_LABEL },
                { v: sumTopQty, s: STYLES.TOTAL_INT },
                { v: sumTopSales, s: STYLES.TOTAL_CURRENCY },
                { v: sumTopCogs, s: STYLES.TOTAL_CURRENCY },
                { v: sumTopSales - sumTopCogs, s: STYLES.TOTAL_CURRENCY }
            ]
        });

        // =========================================================================
        // SHEET 4: 4. Sổ Chi & Hóa Đơn
        // =========================================================================
        const sheet4Rows = [
            { height: 28, cells: [{ v: `SỔ CHI TIẾT KHOẢN CHI & DANH SÁCH HÓA ĐƠN — THÁNG ${mm}/${yyyy}`, s: STYLES.TITLE }] },
            [],
            { height: 22, cells: [{ v: 'I. DANH SÁCH CÁC KHOẢN CHI TỪ KÉT TRONG THÁNG', s: STYLES.SECTION }] },
            {
                height: 25,
                cells: [
                    { v: 'STT', s: STYLES.HEADER_CENTER },
                    { v: 'Ngày chi', s: STYLES.HEADER_CENTER },
                    { v: 'Giờ nhập', s: STYLES.HEADER_CENTER },
                    { v: 'Danh mục chi', s: STYLES.HEADER_LEFT },
                    { v: 'Diễn giải / Ghi chú', s: STYLES.HEADER_LEFT },
                    { v: 'Số tiền chi', s: STYLES.HEADER_RIGHT }
                ]
            }
        ];

        expenses.forEach((ex, idx) => {
            sheet4Rows.push({
                cells: [
                    { v: idx + 1, s: STYLES.CENTER },
                    { v: formatVNDate(ex.date_str), s: STYLES.CENTER },
                    { v: ex.time_str || '', s: STYLES.CENTER },
                    { v: ex.category, s: STYLES.TEXT },
                    { v: ex.description || '', s: STYLES.TEXT },
                    { v: parseFloat(ex.amount) || 0, s: STYLES.CURRENCY }
                ]
            });
        });

        sheet4Rows.push({
            height: 24,
            cells: [
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: 'TỔNG CHI PHÍ THÁNG', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: totalExpensesMonth, s: STYLES.TOTAL_CURRENCY }
            ]
        });

        sheet4Rows.push([], { height: 22, cells: [{ v: 'II. NHẬT KÝ TẤT CẢ HÓA ĐƠN BÁN HÀNG TRONG THÁNG', s: STYLES.SECTION }] });
        sheet4Rows.push({
            height: 25,
            cells: [
                { v: 'Mã đơn', s: STYLES.HEADER_CENTER },
                { v: 'Ngày', s: STYLES.HEADER_CENTER },
                { v: 'Giờ', s: STYLES.HEADER_CENTER },
                { v: 'Thanh toán', s: STYLES.HEADER_CENTER },
                { v: 'Số ly', s: STYLES.HEADER_RIGHT },
                { v: 'Chi tiết món gọi', s: STYLES.HEADER_LEFT },
                { v: 'Giảm giá', s: STYLES.HEADER_RIGHT },
                { v: 'Thực thu', s: STYLES.HEADER_RIGHT },
                { v: 'Giá vốn', s: STYLES.HEADER_RIGHT },
                { v: 'Lợi nhuận gộp', s: STYLES.HEADER_RIGHT },
                { v: 'Ghi chú đơn', s: STYLES.HEADER_LEFT }
            ]
        });

        for (const o of orders) {
            const oDets = detailsByOrder[o.id] || [];
            let orderCups = 0;
            const summaryParts = oDets.map(d => {
                const cupQ = parseInt(d.quantity, 10) || 1;
                orderCups += cupQ;
                const dTops = toppingsByDetail[d.order_detail_id] || [];
                const topText = dTops.length > 0
                    ? ` [+ ${dTops.map(t => {
                        const perCup = Math.max(1, Math.round((parseInt(t.quantity, 10) || cupQ) / cupQ));
                        return `${perCup > 1 ? perCup + 'x ' : ''}${t.name}`;
                    }).join(', ')}]`
                    : '';
                const noteText = d.note ? ` (${d.note})` : '';
                return `${cupQ}x ${d.name} (${d.size_name})${topText}${noteText}`;
            });

            const rev = parseFloat(o.total_amount) || 0;
            const disc = parseFloat(o.discount_amount) || 0;
            const cg = parseFloat(o.total_cogs) || 0;

            sheet4Rows.push({
                cells: [
                    { v: `#${o.id}`, s: STYLES.CENTER },
                    { v: formatVNDate(o.date_str), s: STYLES.CENTER },
                    { v: o.time_str, s: STYLES.CENTER },
                    { v: o.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt', s: STYLES.CENTER },
                    { v: orderCups, s: STYLES.INT },
                    { v: summaryParts.join(' | '), s: STYLES.TEXT_WRAP },
                    { v: disc, s: STYLES.CURRENCY },
                    { v: rev, s: STYLES.CURRENCY },
                    { v: cg, s: STYLES.CURRENCY },
                    { v: rev - cg, s: STYLES.CURRENCY },
                    { v: o.order_note || '', s: STYLES.TEXT }
                ]
            });
        }

        sheet4Rows.push({
            height: 24,
            cells: [
                { v: 'TỔNG', s: STYLES.TOTAL_LABEL },
                { v: `${totalOrdersMonth} đơn`, s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: totalCupsMonth, s: STYLES.TOTAL_INT },
                { v: '', s: STYLES.TOTAL_LABEL },
                { v: totalDiscountMonth, s: STYLES.TOTAL_CURRENCY },
                { v: totalRevenueMonth, s: STYLES.TOTAL_CURRENCY },
                { v: totalCogsMonth, s: STYLES.TOTAL_CURRENCY },
                { v: grossProfitMonth, s: STYLES.TOTAL_CURRENCY },
                { v: '', s: STYLES.TOTAL_LABEL }
            ]
        });

        const xlsxBuffer = buildXlsxWorkbook([
            {
                name: '1. Tổng Quan Tháng',
                columns: [46, 22, 40],
                merges: ['A1:C1', 'A2:C2'],
                rows: sheet1Rows
            },
            {
                name: '2. Theo Ngày',
                columns: [13, 9, 9, 14, 17, 16, 16, 15, 16, 15, 16, 16, 16, 15, 26],
                merges: ['A1:O1', 'A2:O2'],
                rows: sheet2Rows
            },
            {
                name: '3. Chi Tiết Món & Topping',
                columns: [7, 20, 28, 12, 12, 13, 18, 18, 18, 13],
                merges: ['A1:J1'],
                rows: sheet3Rows
            },
            {
                name: '4. Sổ Chi & Hóa Đơn',
                columns: [10, 13, 11, 16, 10, 52, 14, 16, 15, 16, 24],
                merges: ['A1:K1'],
                rows: sheet4Rows
            }
        ]);

        const filename = `Bao_Cao_EmBong_Thang_${mm}_${yyyy}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(xlsxBuffer);
    } catch (err) {
        console.error('[Export Excel Error]:', err);
        res.status(500).json({ error: 'Lỗi khi tạo file Excel: ' + err.message });
    }
};
