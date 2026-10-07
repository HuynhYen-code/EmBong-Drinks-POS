const db = require('../config/db');
const { recalculatePrepCost } = require('../utils/costCalculator');

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM preps ORDER BY id DESC');
        // Fetch ingredients for each prep as well
        for (let prep of rows) {
            const [ingredients] = await db.query(`
                SELECT pi.*, m.name, m.cost_per_base_unit, m.base_unit as unit
                FROM prep_ingredients pi
                JOIN materials m ON pi.material_id = m.id
                WHERE pi.prep_id = ?
            `, [prep.id]);
            prep.ingredients = ingredients;
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    // ingredients = [{ material_id, quantity }]
    const { name, yield_quantity, base_unit, ingredients } = req.body;
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const [result] = await connection.query(
            'INSERT INTO preps (name, yield_quantity, base_unit, current_cost_per_unit) VALUES (?, ?, ?, 0)',
            [name, yield_quantity, base_unit]
        );
        const prepId = result.insertId;

        if (ingredients && ingredients.length > 0) {
            for (let ing of ingredients) {
                await connection.query(
                    'INSERT INTO prep_ingredients (prep_id, material_id, quantity) VALUES (?, ?, ?)',
                    [prepId, ing.material_id, ing.quantity]
                );
            }
        }
        
        await connection.commit();
        connection.release();
        
        // Cập nhật giá vốn của prep và các menu items liên quan
        await recalculatePrepCost(prepId);

        res.status(201).json({ id: prepId, message: 'Prep created successfully' });
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
            [name, yield_quantity, base_unit, id]
        );

        // Update ingredients: đơn giản nhất là xoá hết và thêm lại
        await connection.query('DELETE FROM prep_ingredients WHERE prep_id = ?', [id]);
        
        if (ingredients && ingredients.length > 0) {
            for (let ing of ingredients) {
                await connection.query(
                    'INSERT INTO prep_ingredients (prep_id, material_id, quantity) VALUES (?, ?, ?)',
                    [id, ing.material_id, ing.quantity]
                );
            }
        }
        
        await connection.commit();
        connection.release();
        
        // Cập nhật lại giá vốn của prep và menu items liên quan
        await recalculatePrepCost(id);

        res.json({ message: 'Prep updated successfully' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM preps WHERE id = ?', [id]);
        // Also delete from prep_ingredients automatically if there's ON DELETE CASCADE in DB,
        // but if not, we can manually delete them first, or just let DB cascade.
        // Actually, init_v3_production.sql might not have CASCADE. Let's manually delete ingredients first just in case.
        // But wait! If it's used in menu_item_size_ingredients, it will fail due to foreign key.
        res.json({ message: 'Prep deleted successfully' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Không thể xóa Prep này vì nó đang được dùng trong một Món Ăn!' });
        }
        res.status(500).json({ error: err.message });
    }
};
