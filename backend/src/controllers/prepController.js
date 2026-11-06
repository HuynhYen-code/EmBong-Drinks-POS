const db = require('../config/db');
const { recalculatePrepCost } = require('../utils/costCalculator');

exports.getAll = async (req, res) => {
    try {
        const [[preps], [allIngredients]] = await Promise.all([
            db.query('SELECT * FROM preps ORDER BY id DESC'),
            db.query(`
                SELECT pi.*, m.name, m.cost_per_base_unit, m.base_unit as unit
                FROM prep_ingredients pi
                JOIN materials m ON pi.material_id = m.id
            `)
        ]);

        const ingByPrep = {};
        for (const ing of allIngredients) {
            if (!ingByPrep[ing.prep_id]) ingByPrep[ing.prep_id] = [];
            ingByPrep[ing.prep_id].push(ing);
        }

        for (const prep of preps) {
            prep.ingredients = ingByPrep[prep.id] || [];
        }

        res.json(preps);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { name, yield_quantity, base_unit, ingredients } = req.body;
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên Bán thành phẩm' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO preps (name, yield_quantity, base_unit, current_cost_per_unit) VALUES (?, ?, ?, 0)',
            [String(name).trim(), parseFloat(yield_quantity) || 1, base_unit || 'ml']
        );
        const prepId = result.insertId;

        if (Array.isArray(ingredients) && ingredients.length > 0) {
            const values = ingredients
                .filter(ing => ing.material_id && parseFloat(ing.quantity) > 0)
                .map(ing => [prepId, ing.material_id, parseFloat(ing.quantity)]);
            if (values.length > 0) {
                await connection.query(
                    'INSERT INTO prep_ingredients (prep_id, material_id, quantity) VALUES ?',
                    [values]
                );
            }
        }

        await connection.commit();
        connection.release();

        await recalculatePrepCost(prepId);
        res.status(201).json({ id: prepId, message: 'Tạo Bán thành phẩm thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { name, yield_quantity, base_unit, ingredients } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            'UPDATE preps SET name = ?, yield_quantity = ?, base_unit = ? WHERE id = ?',
            [String(name).trim(), parseFloat(yield_quantity) || 1, base_unit || 'ml', id]
        );

        await connection.query('DELETE FROM prep_ingredients WHERE prep_id = ?', [id]);

        if (Array.isArray(ingredients) && ingredients.length > 0) {
            const values = ingredients
                .filter(ing => ing.material_id && parseFloat(ing.quantity) > 0)
                .map(ing => [id, ing.material_id, parseFloat(ing.quantity)]);
            if (values.length > 0) {
                await connection.query(
                    'INSERT INTO prep_ingredients (prep_id, material_id, quantity) VALUES ?',
                    [values]
                );
            }
        }

        await connection.commit();
        connection.release();

        await recalculatePrepCost(id);
        res.json({ message: 'Cập nhật Bán thành phẩm thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const [menuUsage] = await db.query(`
            SELECT mi.name, mis.size_name
            FROM menu_item_size_ingredients misi
            JOIN menu_item_sizes mis ON misi.menu_item_size_id = mis.id
            JOIN menu_items mi ON mis.menu_item_id = mi.id
            WHERE misi.ingredient_type = 'prep' AND misi.ingredient_id = ?
              AND mis.is_active = 1 AND mi.is_active = 1
            LIMIT 1
        `, [id]);
        if (menuUsage.length > 0) {
            return res.status(400).json({
                error: `Không thể xóa! Prep này đang dùng trong món "${menuUsage[0].name} (${menuUsage[0].size_name})".`
            });
        }

        const [toppingUsage] = await db.query(`
            SELECT t.name
            FROM topping_ingredients ti
            JOIN toppings t ON ti.topping_id = t.id
            WHERE ti.ingredient_type = 'prep' AND ti.ingredient_id = ? AND t.is_active = 1
            LIMIT 1
        `, [id]);
        if (toppingUsage.length > 0) {
            return res.status(400).json({
                error: `Không thể xóa! Prep này đang dùng trong Topping "${toppingUsage[0].name}".`
            });
        }

        await db.query('DELETE FROM menu_item_size_ingredients WHERE ingredient_type = "prep" AND ingredient_id = ?', [id]);
        await db.query('DELETE FROM topping_ingredients WHERE ingredient_type = "prep" AND ingredient_id = ?', [id]);
        await db.query('DELETE FROM preps WHERE id = ?', [id]);

        res.json({ message: 'Đã xóa Bán thành phẩm thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
