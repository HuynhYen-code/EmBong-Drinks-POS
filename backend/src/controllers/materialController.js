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
    if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên nguyên liệu' });
    }
    try {
        const rate = parseFloat(conversion_rate) > 0 ? parseFloat(conversion_rate) : 1;
        const price = parseFloat(current_price) || 0;
        const cost_per_base_unit = (price / rate).toFixed(4);

        const [result] = await db.query(
            `INSERT INTO materials 
            (name, purchase_unit, base_unit, conversion_rate, current_price, cost_per_base_unit, stock_quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [String(name).trim(), purchase_unit || 'Gói', base_unit || 'g', rate, price, cost_per_base_unit, parseFloat(stock_quantity) || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Đã thêm nguyên liệu thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { name, purchase_unit, base_unit, conversion_rate, current_price, stock_quantity } = req.body;
    try {
        const rate = parseFloat(conversion_rate) > 0 ? parseFloat(conversion_rate) : 1;
        const price = parseFloat(current_price) || 0;
        const cost_per_base_unit = (price / rate).toFixed(4);

        // Nếu frontend không truyền stock_quantity khi sửa giá thì giữ nguyên tồn kho cũ
        if (stock_quantity !== undefined && stock_quantity !== null && stock_quantity !== '') {
            await db.query(
                `UPDATE materials 
                 SET name = ?, purchase_unit = ?, base_unit = ?, conversion_rate = ?, current_price = ?, cost_per_base_unit = ?, stock_quantity = ? 
                 WHERE id = ?`,
                [String(name).trim(), purchase_unit, base_unit, rate, price, cost_per_base_unit, parseFloat(stock_quantity) || 0, id]
            );
        } else {
            await db.query(
                `UPDATE materials 
                 SET name = ?, purchase_unit = ?, base_unit = ?, conversion_rate = ?, current_price = ?, cost_per_base_unit = ? 
                 WHERE id = ?`,
                [String(name).trim(), purchase_unit, base_unit, rate, price, cost_per_base_unit, id]
            );
        }

        // Tính toán lại giá vốn của Prep, MenuItem và Topping liên quan
        await recalculateFromMaterial(id);

        res.json({ message: 'Cập nhật nguyên liệu thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateStocktake = async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Danh sách kiểm kê trống' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const item of items) {
            const qty = Math.max(0, parseFloat(item.actual_qty) || 0);
            await connection.query(
                'UPDATE materials SET stock_quantity = ? WHERE id = ?',
                [qty, item.id]
            );
        }
        await connection.commit();
        connection.release();
        res.json({ message: 'Đã lưu kết quả kiểm kê kho thành công!' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Kiểm tra trong Món ăn đang hoạt động
        const [menuUsage] = await db.query(`
            SELECT mi.name, mis.size_name
            FROM menu_item_size_ingredients misi
            JOIN menu_item_sizes mis ON misi.menu_item_size_id = mis.id
            JOIN menu_items mi ON mis.menu_item_id = mi.id
            WHERE misi.ingredient_type = 'material' AND misi.ingredient_id = ?
              AND mis.is_active = 1 AND mi.is_active = 1
            LIMIT 1
        `, [id]);
        if (menuUsage.length > 0) {
            return res.status(400).json({
                error: `Không thể xóa! Nguyên liệu đang dùng trong món "${menuUsage[0].name} (${menuUsage[0].size_name})".`
            });
        }

        // 2. Kiểm tra trong Bán thành phẩm (Prep)
        const [prepUsage] = await db.query(`
            SELECT p.name
            FROM prep_ingredients pi
            JOIN preps p ON pi.prep_id = p.id
            WHERE pi.material_id = ?
            LIMIT 1
        `, [id]);
        if (prepUsage.length > 0) {
            return res.status(400).json({
                error: `Không thể xóa! Nguyên liệu đang dùng trong Bán thành phẩm "${prepUsage[0].name}".`
            });
        }

        // 3. Kiểm tra trong Topping đang hoạt động
        const [toppingUsage] = await db.query(`
            SELECT t.name
            FROM topping_ingredients ti
            JOIN toppings t ON ti.topping_id = t.id
            WHERE ti.ingredient_type = 'material' AND ti.ingredient_id = ? AND t.is_active = 1
            LIMIT 1
        `, [id]);
        if (toppingUsage.length > 0) {
            return res.status(400).json({
                error: `Không thể xóa! Nguyên liệu đang dùng trong Topping "${toppingUsage[0].name}".`
            });
        }

        // Dọn dẹp liên kết mồ côi ở các món/topping đã ẩn (nếu có) trước khi xóa
        await db.query('DELETE FROM menu_item_size_ingredients WHERE ingredient_type = "material" AND ingredient_id = ?', [id]);
        await db.query('DELETE FROM topping_ingredients WHERE ingredient_type = "material" AND ingredient_id = ?', [id]);

        await db.query('DELETE FROM materials WHERE id = ?', [id]);
        res.json({ message: 'Đã xóa nguyên liệu thành công' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Không thể xóa nguyên liệu này vì đang được sử dụng trong công thức khác!' });
        }
        res.status(500).json({ error: err.message });
    }
};
