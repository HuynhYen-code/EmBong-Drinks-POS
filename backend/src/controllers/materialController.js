const db = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM materials ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { name, purchase_unit, base_unit, conversion_rate, current_price, stock_quantity } = req.body;
    try {
        const rate = parseFloat(conversion_rate) || 1;
        const price = parseFloat(current_price) || 0;
        const cost_per_base_unit = (price / rate).toFixed(4);

        const [result] = await db.query(
            `INSERT INTO materials 
            (name, purchase_unit, base_unit, conversion_rate, current_price, cost_per_base_unit, stock_quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name || 'Nguyên liệu mới', purchase_unit || 'Gói', base_unit || 'g', rate, price, cost_per_base_unit, parseFloat(stock_quantity) || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Material created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { name, purchase_unit, base_unit, conversion_rate, current_price, stock_quantity } = req.body;
    try {
        const rate = parseFloat(conversion_rate) || 1;
        const price = parseFloat(current_price) || 0;
        const cost_per_base_unit = (price / rate).toFixed(4);

        await db.query(
            `UPDATE materials 
            SET name = ?, purchase_unit = ?, base_unit = ?, conversion_rate = ?, current_price = ?, cost_per_base_unit = ?, stock_quantity = ? 
            WHERE id = ?`,
            [name, purchase_unit, base_unit, rate, price, cost_per_base_unit, parseFloat(stock_quantity) || 0, id]
        );
        
        // Update lại current_cost_per_unit cho các preps có sử dụng material này
        const [prepsAffected] = await db.query('SELECT DISTINCT prep_id FROM prep_ingredients WHERE material_id = ?', [id]);
        for (let prep of prepsAffected) {
            await updatePrepCost(prep.prep_id);
        }

        res.json({ message: 'Material updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

async function updatePrepCost(prepId) {
    const [ingredients] = await db.query(`
        SELECT pi.quantity, m.cost_per_base_unit 
        FROM prep_ingredients pi
        JOIN materials m ON pi.material_id = m.id
        WHERE pi.prep_id = ?
    `, [prepId]);
    
    let totalCost = 0;
    ingredients.forEach(ing => {
        totalCost += (ing.quantity * ing.cost_per_base_unit);
    });

    const [prepRows] = await db.query('SELECT yield_quantity FROM preps WHERE id = ?', [prepId]);
    if (prepRows.length > 0) {
        const yieldQty = prepRows[0].yield_quantity;
        const newCostPerUnit = yieldQty > 0 ? (totalCost / yieldQty).toFixed(4) : 0;
        await db.query('UPDATE preps SET current_cost_per_unit = ? WHERE id = ?', [newCostPerUnit, prepId]);
    }
}

exports.updatePrepCost = updatePrepCost; // export in case we need it elsewhere
