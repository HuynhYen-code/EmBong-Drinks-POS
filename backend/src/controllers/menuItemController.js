const db = require('../config/db');
const { recalculateMenuItemCogs } = require('../utils/costCalculator');

exports.getAll = async (req, res) => {
    try {
        // 4 truy vấn chạy song song thay vì vòng lặp N+1 (~47 roundtrips -> 1 roundtrip)
        const [[items], [sizes], [allIngs], [toppings]] = await Promise.all([
            db.query('SELECT * FROM menu_items WHERE is_active = 1 ORDER BY id DESC'),
            db.query('SELECT * FROM menu_item_sizes WHERE is_active = 1 ORDER BY price ASC, id ASC'),
            db.query(`
                SELECT misi.*,
                       COALESCE(m.name, p.name) as name,
                       COALESCE(m.base_unit, p.base_unit) as unit,
                       COALESCE(m.cost_per_base_unit, p.current_cost_per_unit) as unit_cost
                FROM menu_item_size_ingredients misi
                JOIN menu_item_sizes mis ON misi.menu_item_size_id = mis.id
                LEFT JOIN materials m ON misi.ingredient_type = 'material' AND misi.ingredient_id = m.id
                LEFT JOIN preps p ON misi.ingredient_type = 'prep' AND misi.ingredient_id = p.id
                WHERE mis.is_active = 1
            `),
            db.query('SELECT id, name, price FROM toppings WHERE is_active = 1 ORDER BY id ASC')
        ]);

        const ingsBySize = {};
        for (const ing of allIngs) {
            if (!ingsBySize[ing.menu_item_size_id]) ingsBySize[ing.menu_item_size_id] = [];
            ingsBySize[ing.menu_item_size_id].push({
                id: ing.id,
                menu_item_size_id: ing.menu_item_size_id,
                ingredient_type: ing.ingredient_type,
                ingredient_id: ing.ingredient_id,
                quantity: parseFloat(ing.quantity),
                name: ing.name,
                unit: ing.unit,
                unit_cost: parseFloat(ing.unit_cost || 0)
            });
        }

        const sizesByItem = {};
        for (const s of sizes) {
            if (!sizesByItem[s.menu_item_id]) sizesByItem[s.menu_item_id] = [];
            sizesByItem[s.menu_item_id].push(s);
        }

        const posMenuItems = [];
        const groupedItems = [];
        const adminItems = [];

        for (const item of items) {
            const itemSizes = sizesByItem[item.id] || [];
            if (itemSizes.length === 0) continue;

            const prices_sizes_map = {};
            const posSizes = [];
            const adminGroupSizes = [];

            for (const s of itemSizes) {
                const priceNum = parseFloat(s.price) || 0;
                const cogsNum = parseFloat(s.current_cogs) || 0;
                const sizeIngs = ingsBySize[s.id] || [];

                prices_sizes_map[s.size_name] = priceNum;

                // Dành cho POS & Tra cứu công thức pha chế (ẩn hoàn toàn giá vốn)
                posSizes.push({
                    id: s.id,
                    size_name: s.size_name,
                    price: priceNum,
                    ingredients: sizeIngs.map(i => ({
                        ingredient_type: i.ingredient_type,
                        ingredient_id: i.ingredient_id,
                        name: i.name,
                        quantity: i.quantity,
                        unit: i.unit
                    }))
                });

                const fullSizeObj = {
                    id: s.id,
                    menu_item_id: item.id,
                    name: item.name,
                    category: item.category,
                    image_url: item.image_url,
                    size: s.size_name,
                    price: priceNum,
                    cogs: cogsNum,
                    ingredients: sizeIngs
                };

                adminGroupSizes.push(fullSizeObj);
                adminItems.push(fullSizeObj);
            }

            posMenuItems.push({
                id: item.id,
                category: item.category,
                name: item.name,
                image_url: item.image_url,
                prices_sizes_map,
                sizes: posSizes
            });

            groupedItems.push({
                id: item.id,
                category: item.category,
                name: item.name,
                image_url: item.image_url,
                sizes: adminGroupSizes
            });
        }

        res.json({
            menu_items: posMenuItems,
            grouped_items: groupedItems,
            admin_items: adminItems,
            toppings: toppings.map(t => ({
                id: t.id,
                name: t.name,
                price: parseFloat(t.price) || 0
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { name, category, image_url, size, price, ingredients } = req.body;
    if (!name || !String(name).trim() || !size || !String(size).trim()) {
        return res.status(400).json({ error: 'Tên món và Size là bắt buộc!' });
    }

    const cleanName = String(name).trim();
    const cleanSize = String(size).trim();
    const cleanCategory = (category && String(category).trim()) || 'Khác';
    const priceNum = parseFloat(price) || 0;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Kiểm tra món theo tên (cả active lẫn soft-deleted)
        const [existing] = await connection.query(
            'SELECT id, is_active FROM menu_items WHERE name = ? LIMIT 1',
            [cleanName]
        );
        let menuItemId;

        if (existing.length > 0) {
            menuItemId = existing[0].id;
            await connection.query(
                'UPDATE menu_items SET is_active = 1, category = ?, image_url = COALESCE(NULLIF(?, ""), image_url) WHERE id = ?',
                [cleanCategory, image_url || '', menuItemId]
            );
        } else {
            const [result] = await connection.query(
                'INSERT INTO menu_items (category, name, image_url, is_active) VALUES (?, ?, ?, 1)',
                [cleanCategory, cleanName, image_url || '']
            );
            menuItemId = result.insertId;
        }

        // 2. Kiểm tra xem size này đã tồn tại trên món chưa
        const [existingSize] = await connection.query(
            'SELECT id, is_active FROM menu_item_sizes WHERE menu_item_id = ? AND size_name = ? LIMIT 1',
            [menuItemId, cleanSize]
        );

        let sizeId;
        if (existingSize.length > 0) {
            if (existingSize[0].is_active === 1) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    error: `Món "${cleanName}" đã có size "${cleanSize}" rồi! Vui lòng bấm Sửa trên size đó.`
                });
            }
            sizeId = existingSize[0].id;
            await connection.query(
                'UPDATE menu_item_sizes SET is_active = 1, price = ?, current_cogs = 0 WHERE id = ?',
                [priceNum, sizeId]
            );
            await connection.query('DELETE FROM menu_item_size_ingredients WHERE menu_item_size_id = ?', [sizeId]);
        } else {
            const [sizeResult] = await connection.query(
                'INSERT INTO menu_item_sizes (menu_item_id, size_name, price, current_cogs, is_active) VALUES (?, ?, ?, 0, 1)',
                [menuItemId, cleanSize, priceNum]
            );
            sizeId = sizeResult.insertId;
        }

        // 3. Batch insert BOM ingredients
        if (Array.isArray(ingredients) && ingredients.length > 0) {
            const values = ingredients
                .filter(ing => ing.ingredient_type && ing.ingredient_id && parseFloat(ing.quantity) > 0)
                .map(ing => [sizeId, ing.ingredient_type, ing.ingredient_id, parseFloat(ing.quantity)]);
            if (values.length > 0) {
                await connection.query(
                    'INSERT INTO menu_item_size_ingredients (menu_item_size_id, ingredient_type, ingredient_id, quantity) VALUES ?',
                    [values]
                );
            }
        }

        await connection.commit();
        connection.release();

        await recalculateMenuItemCogs(sizeId);
        res.status(201).json({ id: sizeId, menu_item_id: menuItemId, message: 'Đã tạo món / size thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const sizeId = req.params.id;
    const { name, image_url, category, size, price, ingredients } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            'UPDATE menu_item_sizes SET price = ?, size_name = ? WHERE id = ?',
            [parseFloat(price) || 0, String(size).trim(), sizeId]
        );

        const [sizeInfo] = await connection.query('SELECT menu_item_id FROM menu_item_sizes WHERE id = ?', [sizeId]);
        if (sizeInfo.length > 0) {
            await connection.query(
                'UPDATE menu_items SET name = COALESCE(?, name), image_url = ?, category = COALESCE(?, category) WHERE id = ?',
                [
                    name ? String(name).trim() : null,
                    image_url !== undefined ? image_url : null,
                    category ? String(category).trim() : null,
                    sizeInfo[0].menu_item_id
                ]
            );
        }

        await connection.query('DELETE FROM menu_item_size_ingredients WHERE menu_item_size_id = ?', [sizeId]);

        if (Array.isArray(ingredients) && ingredients.length > 0) {
            const values = ingredients
                .filter(ing => ing.ingredient_type && ing.ingredient_id && parseFloat(ing.quantity) > 0)
                .map(ing => [sizeId, ing.ingredient_type, ing.ingredient_id, parseFloat(ing.quantity)]);
            if (values.length > 0) {
                await connection.query(
                    'INSERT INTO menu_item_size_ingredients (menu_item_size_id, ingredient_type, ingredient_id, quantity) VALUES ?',
                    [values]
                );
            }
        }

        await connection.commit();
        connection.release();

        await recalculateMenuItemCogs(sizeId);
        res.json({ message: 'Cập nhật món / size thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.deleteSize = async (req, res) => {
    const sizeId = req.params.id;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT id, menu_item_id, size_name FROM menu_item_sizes WHERE id = ?',
            [sizeId]
        );
        if (rows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: 'Không tìm thấy size cần xóa' });
        }

        const { menu_item_id, size_name } = rows[0];

        // Kiểm tra xem size này đã từng phát sinh hóa đơn chưa
        const [ordered] = await connection.query(
            'SELECT id FROM order_details WHERE menu_item_id = ? AND size_name = ? LIMIT 1',
            [menu_item_id, size_name]
        );

        await connection.query('DELETE FROM menu_item_size_ingredients WHERE menu_item_size_id = ?', [sizeId]);

        if (ordered.length > 0) {
            await connection.query('UPDATE menu_item_sizes SET is_active = 0 WHERE id = ?', [sizeId]);
        } else {
            await connection.query('DELETE FROM menu_item_sizes WHERE id = ?', [sizeId]);
        }

        // Nếu món cha không còn size nào đang active -> ẩn/xóa luôn món cha
        const [remainingActive] = await connection.query(
            'SELECT id FROM menu_item_sizes WHERE menu_item_id = ? AND is_active = 1 LIMIT 1',
            [menu_item_id]
        );

        if (remainingActive.length === 0) {
            const [itemOrdered] = await connection.query(
                'SELECT id FROM order_details WHERE menu_item_id = ? LIMIT 1',
                [menu_item_id]
            );
            if (itemOrdered.length > 0) {
                await connection.query('UPDATE menu_items SET is_active = 0 WHERE id = ?', [menu_item_id]);
            } else {
                await connection.query('DELETE FROM menu_items WHERE id = ?', [menu_item_id]);
            }
        }

        await connection.commit();
        connection.release();
        res.json({ message: 'Đã xóa size món thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.deleteItem = async (req, res) => {
    const menuItemId = req.params.id;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [itemOrdered] = await connection.query(
            'SELECT id FROM order_details WHERE menu_item_id = ? LIMIT 1',
            [menuItemId]
        );

        await connection.query(
            'DELETE FROM menu_item_size_ingredients WHERE menu_item_size_id IN (SELECT id FROM menu_item_sizes WHERE menu_item_id = ?)',
            [menuItemId]
        );

        if (itemOrdered.length > 0) {
            await connection.query('UPDATE menu_item_sizes SET is_active = 0 WHERE menu_item_id = ?', [menuItemId]);
            await connection.query('UPDATE menu_items SET is_active = 0 WHERE id = ?', [menuItemId]);
        } else {
            await connection.query('DELETE FROM menu_items WHERE id = ?', [menuItemId]);
        }

        await connection.commit();
        connection.release();
        res.json({ message: 'Đã xóa món khỏi thực đơn thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.migrateCategories = async (req, res) => {
    try {
        // 1. Cà phê & Cacao -> "Cà Phê - Cacao"
        await db.query(`
            UPDATE menu_items 
            SET category = 'Cà Phê - Cacao'
            WHERE category IN ('Cà Phê', 'Cà phê', 'Ca phe', 'Cafe', 'cà phê', 'ca phe')
               OR LOWER(name) LIKE '%cà phê%' 
               OR LOWER(name) LIKE '%ca phe%' 
               OR LOWER(name) LIKE '%cacao%' 
               OR LOWER(name) LIKE '%ca cao%' 
               OR LOWER(name) LIKE '%bạc xỉu%' 
               OR LOWER(name) LIKE '%bac xiu%'
        `);

        // 2. Trà trái cây -> "Trà Trái Cây" (các món trà kết hợp trái cây)
        await db.query(`
            UPDATE menu_items 
            SET category = 'Trà Trái Cây'
            WHERE (
                category IN ('Trà / Trà Sữa', 'Trà / Trà sữa', 'Trà/Trà Sữa', 'Trà/Trà sữa', 'Trà', 'Khác')
                OR category LIKE '%Trà%'
            )
            AND (
                LOWER(name) LIKE '%trà đào%' 
                OR LOWER(name) LIKE '%tra dao%'
                OR LOWER(name) LIKE '%trà dâu%' 
                OR LOWER(name) LIKE '%tra dau%'
                OR LOWER(name) LIKE '%trà nho%' 
                OR LOWER(name) LIKE '%tra nho%'
                OR LOWER(name) LIKE '%trà kiwi%' 
                OR LOWER(name) LIKE '%tra kiwi%'
                OR LOWER(name) LIKE '%trà ổi%' 
                OR LOWER(name) LIKE '%tra oi%'
                OR LOWER(name) LIKE '%trà chanh%' 
                OR LOWER(name) LIKE '%tra chanh%'
                OR LOWER(name) LIKE '%trà tắc%' 
                OR LOWER(name) LIKE '%tra tac%'
                OR LOWER(name) LIKE '%trà việt quất%' 
                OR LOWER(name) LIKE '%tra viet quat%'
                OR LOWER(name) LIKE '%trà mãng cầu%' 
                OR LOWER(name) LIKE '%tra mang cau%'
                OR LOWER(name) LIKE '%trà vải%' 
                OR LOWER(name) LIKE '%tra vai%'
                OR LOWER(name) LIKE '%trà xoài%' 
                OR LOWER(name) LIKE '%tra xoai%'
                OR LOWER(name) LIKE '%trà bưởi%' 
                OR LOWER(name) LIKE '%tra buoi%'
                OR LOWER(name) LIKE '%trà thơm%' 
                OR LOWER(name) LIKE '%trà dứa%' 
                OR LOWER(name) LIKE '%trà táo%' 
                OR LOWER(name) LIKE '%trà lựu%' 
                OR LOWER(name) LIKE '%trà dưa lưới%' 
                OR LOWER(name) LIKE '%trà thanh long%' 
                OR LOWER(name) LIKE '%trà sen%' 
                OR LOWER(name) LIKE '%trà trái cây%' 
                OR LOWER(name) LIKE '%trà hoa quả%'
            )
            AND LOWER(name) NOT LIKE '%sữa%'
            AND LOWER(name) NOT LIKE '%sua%'
            AND LOWER(name) NOT LIKE '%latte%'
        `);

        // 3. Đổi phân loại cũ 'Trà / Trà Sữa' còn lại sang 'Trà Sữa - Sữa Tươi'
        await db.query(`
            UPDATE menu_items 
            SET category = 'Trà Sữa - Sữa Tươi'
            WHERE category IN ('Trà / Trà Sữa', 'Trà / Trà sữa', 'Trà/Trà Sữa', 'Trà/Trà sữa', 'Trà Sữa', 'Trà sữa', 'Sữa tươi', 'Sua tuoi')
        `);

        // 4. Các món trà sữa / sữa tươi cụ thể (như Olong lài sữa, Sữa tươi trân châu đường đen, Sữa dừa sương sáo)
        await db.query(`
            UPDATE menu_items 
            SET category = 'Trà Sữa - Sữa Tươi'
            WHERE (LOWER(name) LIKE '%olong lài sữa%' OR LOWER(name) LIKE '%sữa tươi trân châu%' OR LOWER(name) LIKE '%sữa dừa sương sáo%')
              AND category NOT IN ('Trà Sữa - Sữa Tươi')
        `);

        const [items] = await db.query('SELECT id, name, category FROM menu_items WHERE is_active = 1 ORDER BY category ASC, id DESC');
        res.json({ message: 'Cập nhật phân loại thành công', items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
