const db = require('../config/db');

exports.create = async (req, res) => {
    const { cart_items, payment_method } = req.body; 
    
    if (!cart_items || cart_items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    const validPaymentMethod = payment_method === 'transfer' ? 'transfer' : 'cash';

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let totalAmount = 0;
        let totalCogs = 0;
        const details = [];
        const detailsToppings = [];

        for (let item of cart_items) {
            const [sizeData] = await connection.query(
                'SELECT price, current_cogs FROM menu_item_sizes WHERE menu_item_id = ? AND size_name = ?', 
                [item.id, item.size]
            );

            if (sizeData.length === 0) throw new Error(`Size ${item.size} not found for item ${item.id}`);
            
            const unitPrice = sizeData[0].price;
            const unitCogs = sizeData[0].current_cogs;
            
            let itemTotalAmount = unitPrice * item.quantity;
            let itemTotalCogs = unitCogs * item.quantity;

            const detIndex = details.length;
            details.push({
                menu_item_id: item.id,
                size_name: item.size,
                quantity: item.quantity,
                unit_price: unitPrice,
                unit_cogs: unitCogs
            });

            if (item.toppings && item.toppings.length > 0) {
                for (let t of item.toppings) {
                    const [topData] = await connection.query('SELECT price, current_cogs FROM toppings WHERE id = ?', [t.id]);
                    if (topData.length > 0) {
                        const topPrice = topData[0].price;
                        const topCogs = topData[0].current_cogs;
                        
                        itemTotalAmount += (topPrice * item.quantity); 
                        itemTotalCogs += (topCogs * item.quantity);
                        
                        detailsToppings.push({
                            detIndex: detIndex,
                            topping_id: t.id,
                            quantity: item.quantity,
                            unit_price: topPrice,
                            unit_cogs: topCogs
                        });
                    }
                }
            }

            totalAmount += itemTotalAmount;
            totalCogs += itemTotalCogs;
        }

        const [orderResult] = await connection.query(
            'INSERT INTO orders (total_amount, total_cogs, payment_method) VALUES (?, ?, ?)',
            [totalAmount, totalCogs, validPaymentMethod]
        );
        const orderId = orderResult.insertId;

        for (let i = 0; i < details.length; i++) {
            const det = details[i];
            const [detResult] = await connection.query(
                'INSERT INTO order_details (order_id, menu_item_id, size_name, quantity, unit_price, unit_cogs) VALUES (?, ?, ?, ?, ?, ?)',
                [orderId, det.menu_item_id, det.size_name, det.quantity, det.unit_price, det.unit_cogs]
            );
            
            const detailId = detResult.insertId;
            
            const relatedToppings = detailsToppings.filter(dt => dt.detIndex === i);
            for (let rt of relatedToppings) {
                await connection.query(
                    'INSERT INTO order_detail_toppings (order_detail_id, topping_id, quantity, unit_price, unit_cogs) VALUES (?, ?, ?, ?, ?)',
                    [detailId, rt.topping_id, rt.quantity, rt.unit_price, rt.unit_cogs]
                );
            }
        }

        await connection.commit();
        connection.release();

        res.status(201).json({ id: orderId, message: 'Checkout successful', payment_method: validPaymentMethod });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.getStats = async (req, res) => {
    const selectedDate = req.query.date; // YYYY-MM-DD
    try {
        // 1. Thống kê 30 ngày gần nhất (Doanh thu, Tiền mặt, Chuyển khoản, COGS, Lợi nhuận)
        const [dailyRev] = await db.query(`
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
        `);

        // 2. Thống kê số ly bán ra theo ngày (tránh join làm nhân đôi doanh thu)
        const [dailyCups] = await db.query(`
            SELECT 
                DATE_FORMAT(o.created_at, '%Y-%m-%d') as date,
                SUM(od.quantity) as cups
            FROM order_details od
            JOIN orders o ON od.order_id = o.id
            GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
            ORDER BY date DESC
            LIMIT 30
        `);

        const cupsMap = {};
        dailyCups.forEach(row => {
            cupsMap[row.date] = parseInt(row.cups) || 0;
        });

        const revenue30Days = dailyRev.map(row => ({
            date: row.date,
            total_orders: parseInt(row.total_orders) || 0,
            revenue: parseFloat(row.revenue) || 0,
            transfer_revenue: parseFloat(row.transfer_revenue) || 0,
            cash_revenue: parseFloat(row.cash_revenue) || 0,
            cogs: parseFloat(row.cogs) || 0,
            profit: parseFloat(row.profit) || 0,
            cups: cupsMap[row.date] || 0
        }));

        // 3. Thống kê tổng hợp trong Tháng này (Month to date)
        const [monthStats] = await db.query(`
            SELECT 
                COUNT(id) as total_orders,
                COALESCE(SUM(total_amount), 0) as month_revenue,
                COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) as month_transfer_revenue,
                COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN 0 ELSE total_amount END), 0) as month_cash_revenue,
                COALESCE(SUM(total_cogs), 0) as month_cogs,
                (COALESCE(SUM(total_amount), 0) - COALESCE(SUM(total_cogs), 0)) as month_profit
            FROM orders
            WHERE YEAR(created_at) = YEAR(CURRENT_DATE()) AND MONTH(created_at) = MONTH(CURRENT_DATE())
        `);

        const [monthCupsData] = await db.query(`
            SELECT COALESCE(SUM(od.quantity), 0) as month_cups
            FROM order_details od
            JOIN orders o ON od.order_id = o.id
            WHERE YEAR(o.created_at) = YEAR(CURRENT_DATE()) AND MONTH(o.created_at) = MONTH(CURRENT_DATE())
        `);

        // 4. Chi tiết từng món bán được (Items Breakdown)
        // Cho cả ngày được chọn (nếu có) và cho tháng này
        let dateItemsBreakdown = [];
        if (selectedDate) {
            const [rows] = await db.query(`
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
                WHERE DATE_FORMAT(o.created_at, '%Y-%m-%d') = ?
                GROUP BY od.menu_item_id, od.size_name
                ORDER BY total_sold DESC
            `, [selectedDate]);
            dateItemsBreakdown = rows.map(r => ({
                id: r.menu_item_id,
                name: r.name,
                size_name: r.size_name,
                total_sold: parseInt(r.total_sold) || 0,
                total_sales: parseFloat(r.total_sales) || 0,
                total_cogs: parseFloat(r.total_cogs) || 0
            }));
        }

        const [monthItemsBreakdownRows] = await db.query(`
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
            WHERE YEAR(o.created_at) = YEAR(CURRENT_DATE()) AND MONTH(o.created_at) = MONTH(CURRENT_DATE())
            GROUP BY od.menu_item_id, od.size_name
            ORDER BY total_sold DESC
        `);

        // 5. Top 5 món bán chạy nhất mọi thời đại
        const [topItems] = await db.query(`
            SELECT m.name, SUM(od.quantity) as total_sold
            FROM order_details od
            JOIN menu_items m ON od.menu_item_id = m.id
            GROUP BY od.menu_item_id
            ORDER BY total_sold DESC
            LIMIT 5
        `);
        
        res.json({
            revenue: revenue30Days,
            this_month: {
                total_orders: parseInt(monthStats[0].total_orders) || 0,
                revenue: parseFloat(monthStats[0].month_revenue) || 0,
                cash_revenue: parseFloat(monthStats[0].month_cash_revenue) || 0,
                transfer_revenue: parseFloat(monthStats[0].month_transfer_revenue) || 0,
                cogs: parseFloat(monthStats[0].month_cogs) || 0,
                profit: parseFloat(monthStats[0].month_profit) || 0,
                cups: parseInt(monthCupsData[0].month_cups) || 0
            },
            top_items: topItems,
            date_items_breakdown: dateItemsBreakdown,
            month_items_breakdown: monthItemsBreakdownRows.map(r => ({
                id: r.menu_item_id,
                name: r.name,
                size_name: r.size_name,
                total_sold: parseInt(r.total_sold) || 0,
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
    
    try {
        const [orders] = await db.query(`
            SELECT id, total_amount, total_cogs, payment_method, DATE_FORMAT(created_at, '%H:%i:%s') as time
            FROM orders
            WHERE DATE(created_at) = ?
            ORDER BY created_at DESC
        `, [dateStr]);

        const [details] = await db.query(`
            SELECT od.id as order_detail_id, od.order_id, m.name, od.size_name, od.quantity, od.unit_price
            FROM order_details od
            JOIN menu_items m ON od.menu_item_id = m.id
            JOIN orders o ON od.order_id = o.id
            WHERE DATE(o.created_at) = ?
        `, [dateStr]);

        const [toppings] = await db.query(`
            SELECT od.order_id, od.id as od_id, t.name, odt.quantity, odt.unit_price
            FROM order_detail_toppings odt
            JOIN toppings t ON odt.topping_id = t.id
            JOIN order_details od ON odt.order_detail_id = od.id
            JOIN orders o ON od.order_id = o.id
            WHERE DATE(o.created_at) = ?
        `, [dateStr]);

        const history = orders.map(o => {
            const oDetails = details.filter(d => d.order_id === o.id).map(d => {
                const itemToppings = toppings.filter(t => t.od_id === d.order_detail_id);
                return { ...d, toppings: itemToppings };
            });
            return {
                id: o.id,
                time: o.time,
                total_amount: o.total_amount,
                payment_method: o.payment_method || 'cash',
                items: oDetails
            };
        });

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
