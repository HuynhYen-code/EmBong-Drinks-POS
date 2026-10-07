const db = require('../config/db');
const { updatePrepCost } = require('./materialController');

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM preps ORDER BY id DESC');
        // Fetch ingredients for each prep as well
        for (let prep of rows) {
            const [ingredients] = await db.query(`
                SELECT pi.*, m.name as material_name, m.cost_per_base_unit 
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
        
        // Cập nhật giá vốn của prep
        await updatePrepCost(prepId);

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
        
        // Cập nhật lại giá vốn
        await updatePrepCost(id);

        res.json({ message: 'Prep updated successfully' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};
