require('dotenv').config();
const db = require('./src/config/db');

(async () => {
    try {
        const [items] = await db.query('SELECT * FROM menu_items ORDER BY id DESC');
        let admin_items = [];
        
        for (let item of items) {
            const [sizes] = await db.query('SELECT * FROM menu_item_sizes WHERE menu_item_id = ?', [item.id]);
            for(let s of sizes) {
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
        }
        console.log(JSON.stringify(admin_items, null, 2));
    } catch(e) { console.error(e); } finally { process.exit(); }
})();
