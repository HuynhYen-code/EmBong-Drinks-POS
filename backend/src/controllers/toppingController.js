const db = require('../config/db');
const { recalculateToppingCogs } = require('../utils/costCalculator');

exports.getAll = async (req, res) => {
    try {
        const [[toppings], [ingredients]] = await Promise.all([
            db.query('SELECT * FROM toppings WHERE is_active = 1 ORDER BY id ASC'),
            db.query(`
                SELECT ti.*, 
                       COALESCE(m.name, p.name) as name,
                       COALESCE(m.base_unit, p.base_unit) as unit,
                       COALESCE(m.cost_per_base_unit, p.current_cost_per_unit) as cost_per_base_unit
                FROM topping_ingredients ti
                LEFT JOIN materials m ON ti.ingredient_type = 'material' AND ti.ingredient_id = m.id
                LEFT JOIN preps p ON ti.ingredient_type = 'prep' AND ti.ingredient_id = p.id
            `)
        ]);

        const ingMap = {};
        ingredients.forEach(ing => {
            if (!ingMap[ing.topping_id]) ingMap[ing.topping_id] = [];
            ingMap[ing.topping_id].push({
                ingredient_type: ing.ingredient_type,
                ingredient_id: ing.ingredient_id,
                name: ing.name,
                quantity: parseFloat(ing.quantity),
                unit: ing.unit,
                cost_per_base_unit: parseFloat(ing.cost_per_base_unit || 0)
            });
        });

        const admin_toppings = toppings.map(t => ({
            id: t.id,
            name: t.name,
            price: parseFloat(t.price),
            cogs: parseFloat(t.current_cogs),
            ingredients: ingMap[t.id] || []
        }));

        res.json(admin_toppings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { name, price, ingredients } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên Topping' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO toppings (name, price, is_active) VALUES (?, ?, 1)',
            [String(name).trim(), parseFloat(price) || 0]
        );
        const toppingId = result.insertId;

        if (Array.isArray(ingredients) && ingredients.length > 0) {
            const values = ingredients
                .filter(ing => ing.ingredient_type && ing.ingredient_id && parseFloat(ing.quantity) > 0)
                .map(ing => [toppingId, ing.ingredient_type, ing.ingredient_id, parseFloat(ing.quantity)]);
            if (values.length > 0) {
                await connection.query(
                    'INSERT INTO topping_ingredients (topping_id, ingredient_type, ingredient_id, quantity) VALUES ?',
                    [values]
                );
            }
        }

        await connection.commit();
        connection.release();

        await recalculateToppingCogs(toppingId);
        res.status(201).json({ id: toppingId, message: 'Đã thêm Topping thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const toppingId = req.params.id;
    const { name, price, ingredients } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            'UPDATE toppings SET name = ?, price = ? WHERE id = ?',
            [String(name).trim(), parseFloat(price) || 0, toppingId]
        );

        await connection.query('DELETE FROM topping_ingredients WHERE topping_id = ?', [toppingId]);
        if (Array.isArray(ingredients) && ingredients.length > 0) {
            const values = ingredients
                .filter(ing => ing.ingredient_type && ing.ingredient_id && parseFloat(ing.quantity) > 0)
                .map(ing => [toppingId, ing.ingredient_type, ing.ingredient_id, parseFloat(ing.quantity)]);
            if (values.length > 0) {
                await connection.query(
                    'INSERT INTO topping_ingredients (topping_id, ingredient_type, ingredient_id, quantity) VALUES ?',
                    [values]
                );
            }
        }

        await connection.commit();
        connection.release();

        await recalculateToppingCogs(toppingId);
        res.json({ message: 'Cập nhật Topping thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const toppingId = req.params.id;
    try {
        const [usedInOrders] = await db.query(
            'SELECT id FROM order_detail_toppings WHERE topping_id = ? LIMIT 1',
            [toppingId]
        );

        if (usedInOrders.length > 0) {
            // Đã từng bán trong hóa đơn lịch sử -> Soft delete để giữ toàn vẹn lịch sử bill
            await db.query('DELETE FROM topping_ingredients WHERE topping_id = ?', [toppingId]);
            await db.query('UPDATE toppings SET is_active = 0 WHERE id = ?', [toppingId]);
            return res.json({ message: 'Đã ngừng kinh doanh Topping (lịch sử hóa đơn cũ vẫn được giữ nguyên)' });
        }

        await db.query('DELETE FROM toppings WHERE id = ?', [toppingId]);
        res.json({ message: 'Đã xóa Topping thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
