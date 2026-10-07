require('dotenv').config();
const db = require('./src/config/db');
const { recalculateMenuItemCogs } = require('./src/utils/costCalculator');

(async () => {
    try {
        const [sizes] = await db.query('SELECT * FROM menu_item_sizes');
        console.log('Sizes:', sizes);

        if (sizes.length > 0) {
            const sizeId = sizes[0].id;
            const query = "SELECT misi.ingredient_type, misi.ingredient_id, misi.quantity, m.cost_per_base_unit as m_cost, p.current_cost_per_unit as p_cost FROM menu_item_size_ingredients misi LEFT JOIN materials m ON misi.ingredient_type = 'material' AND misi.ingredient_id = m.id LEFT JOIN preps p ON misi.ingredient_type = 'prep' AND misi.ingredient_id = p.id WHERE misi.menu_item_size_id = ?";
            const [ings] = await db.query(query, [sizeId]);
            console.log('Ingredients for size', sizeId, ':', ings);

            let totalCogs = 0;
            for (let ing of ings) {
                let cost = 0;
                if (ing.ingredient_type === 'material' && ing.m_cost) cost = Number(ing.m_cost);
                if (ing.ingredient_type === 'prep' && ing.p_cost) cost = Number(ing.p_cost);
                console.log('Ing cost:', cost, 'Quantity:', Number(ing.quantity));
                totalCogs += cost * Number(ing.quantity);
            }
            console.log('Total COGS manual calculate:', totalCogs);

            await recalculateMenuItemCogs(sizeId);
            const [updated] = await db.query('SELECT current_cogs FROM menu_item_sizes WHERE id = ?', [sizeId]);
            console.log('Calculated COGS after function:', updated[0]?.current_cogs);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
