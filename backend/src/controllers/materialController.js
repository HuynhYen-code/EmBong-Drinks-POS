const db = require('../config/db');
const { recalculateFromMaterial } = require('../utils/costCalculator');

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
        
        // Tính toán lại giá vốn của Prep và MenuItem liên quan
        await recalculateFromMaterial(id);

        res.json({ message: 'Material updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        // Kiểm tra xem Material có đang được dùng trong MenuItem nào không (Polymorphic FK)
        const [menuUsage] = await db.query('SELECT id FROM menu_item_size_ingredients WHERE ingredient_type = "material" AND ingredient_id = ? LIMIT 1', [id]);
        if (menuUsage.length > 0) {
            return res.status(400).json({ error: 'Không thể xóa nguyên liệu này vì nó đang được dùng trực tiếp trong một Món ăn!' });
        }

        await db.query('DELETE FROM materials WHERE id = ?', [id]);
        res.json({ message: 'Material deleted successfully' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Không thể xóa nguyên liệu này vì nó đang được dùng trong công thức Bán thành phẩm (Prep)!' });
        }
        res.status(500).json({ error: err.message });
    }
};

// updatePrepCost has been moved to costCalculator
