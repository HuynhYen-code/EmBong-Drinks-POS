const db = require('../config/db');

exports.create = async (req, res) => {
    const { cart_items } = req.body; 
    
    if (!cart_items || cart_items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

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
            'INSERT INTO orders (total_amount, total_cogs) VALUES (?, ?)',
            [totalAmount, totalCogs]
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

        res.status(201).json({ id: orderId, message: 'Checkout successful' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [revenueData] = await db.query(`
            SELECT DATE(created_at) as date, SUM(total_amount) as revenue, SUM(total_cogs) as cogs, (SUM(total_amount) - SUM(total_cogs)) as profit
            FROM orders
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) DESC
            LIMIT 30
        `);
        
        const [topItems] = await db.query(`
            SELECT m.name, SUM(od.quantity) as total_sold
            FROM order_details od
            JOIN menu_items m ON od.menu_item_id = m.id
            GROUP BY od.menu_item_id
            ORDER BY total_sold DESC
            LIMIT 5
        `);
        
        res.json({
            revenue: revenueData,
            top_items: topItems
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
            SELECT id, total_amount, total_cogs, DATE_FORMAT(created_at, '%H:%i:%s') as time
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
                items: oDetails
            };
        });

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
