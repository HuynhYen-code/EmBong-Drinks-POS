const db = require('../config/db');
const { recalculateMenuItemCogs } = require('../utils/costCalculator');

// updateMenuItemSizeCogs has been moved to costCalculator

exports.getAll = async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM menu_items ORDER BY id DESC');
        let admin_items = [];
        
        for (let item of items) {
            const [sizes] = await db.query('SELECT * FROM menu_item_sizes WHERE menu_item_id = ?', [item.id]);
            const prices_sizes_map = {};
            
            for(let s of sizes) {
                prices_sizes_map[s.size_name] = s.price;
                
                const [ings] = await db.query(`
                    SELECT misi.*, 
                           COALESCE(m.name, p.name) as name, 
                           COALESCE(m.base_unit, p.base_unit) as unit
                    FROM menu_item_size_ingredients misi
                    LEFT JOIN materials m ON misi.ingredient_type = 'material' AND misi.ingredient_id = m.id
                    LEFT JOIN preps p ON misi.ingredient_type = 'prep' AND misi.ingredient_id = p.id
                    WHERE misi.menu_item_size_id = ?
                `, [s.id]);

                admin_items.push({
                    id: s.id, // size_id
                    menu_item_id: item.id,
                    name: item.name,
                    category: item.category,
                    image_url: item.image_url,
                    size: s.size_name,
                    price: s.price,
                    cogs: s.current_cogs,
                    ingredients: ings
                });
            }
            item.prices_sizes_map = prices_sizes_map;
        }
        
        const [toppings] = await db.query('SELECT id, name, price FROM toppings');

        res.json({
            menu_items: items,
            admin_items: admin_items,
            toppings: toppings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    // Expected structure from frontend form:
    // { name, category, image_url, size, price, ingredients: [{ingredient_type, ingredient_id, quantity}] }
    // Note: The UI is currently sending ONE size at a time per form submission to make it simple.
    
    const { name, category, image_url, size, price, ingredients } = req.body;
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 1. Kiểm tra xem món này đã tồn tại chưa (tìm theo tên)
        const [existing] = await connection.query('SELECT id FROM menu_items WHERE name = ? LIMIT 1', [name]);
        let menuItemId;
        
        if (existing.length > 0) {
            menuItemId = existing[0].id;
            // Cập nhật lại ảnh nếu người dùng có gửi ảnh mới
            if (image_url) {
                await connection.query('UPDATE menu_items SET image_url = ? WHERE id = ?', [image_url, menuItemId]);
            }
        } else {
            const [result] = await connection.query(
                'INSERT INTO menu_items (category, name, image_url) VALUES (?, ?, ?)',
                [category || 'Khác', name, image_url]
            );
            menuItemId = result.insertId;
        }

        // 2. Insert size
        const [sizeResult] = await connection.query(
            'INSERT INTO menu_item_sizes (menu_item_id, size_name, price, current_cogs) VALUES (?, ?, ?, 0)',
            [menuItemId, size, price]
        );
        const sizeId = sizeResult.insertId;

        // 3. Insert ingredients (BOM)
        if (ingredients && ingredients.length > 0) {
            for (let ing of ingredients) {
                await connection.query(
                    'INSERT INTO menu_item_size_ingredients (menu_item_size_id, ingredient_type, ingredient_id, quantity) VALUES (?, ?, ?, ?)',
                    [sizeId, ing.ingredient_type, ing.ingredient_id, ing.quantity]
                );
            }
        }
        
        await connection.commit();
        connection.release();

        // 4. Calculate COGS (do this AFTER commit to prevent Deadlock)
        await recalculateMenuItemCogs(sizeId);

        res.status(201).json({ id: sizeId, message: 'Menu item size created successfully' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    // Cập nhật BOM, Hình ảnh, Giá bán của một Size cụ thể
    const sizeId = req.params.id; // đây là ID của menu_item_size
    const { name, image_url, category, size, price, ingredients } = req.body;
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Update price and size name
        await connection.query('UPDATE menu_item_sizes SET price = ?, size_name = ? WHERE id = ?', [price, size, sizeId]);
        
        // Lấy menu_item_id để update name, image & category
        const [sizeInfo] = await connection.query('SELECT menu_item_id FROM menu_item_sizes WHERE id = ?', [sizeId]);
        if (sizeInfo.length > 0) {
            await connection.query(
                'UPDATE menu_items SET name = COALESCE(?, name), image_url = COALESCE(?, image_url), category = COALESCE(?, category) WHERE id = ?', 
                [name, image_url, category, sizeInfo[0].menu_item_id]
            );
        }
        
        // Thay thế toàn bộ BOM
        await connection.query('DELETE FROM menu_item_size_ingredients WHERE menu_item_size_id = ?', [sizeId]);
        
        if (ingredients && ingredients.length > 0) {
            for (let ing of ingredients) {
                await connection.query(
                    'INSERT INTO menu_item_size_ingredients (menu_item_size_id, ingredient_type, ingredient_id, quantity) VALUES (?, ?, ?, ?)',
                    [sizeId, ing.ingredient_type, ing.ingredient_id, ing.quantity]
                );
            }
        }
        
        await connection.commit();
        connection.release();

        await recalculateMenuItemCogs(sizeId);
        res.json({ message: 'Menu item size updated successfully' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};
