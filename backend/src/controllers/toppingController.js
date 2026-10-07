const db = require('../config/db');

exports.getAll = async (req, res) => {
    try {
        const [toppings] = await db.query('SELECT * FROM toppings');
        
        const [ingredients] = await db.query(`
            SELECT ti.*, 
                   COALESCE(m.name, p.name) as name,
                   COALESCE(m.base_unit, p.base_unit) as unit,
                   COALESCE(m.cost_per_base_unit, p.current_cost_per_unit) as cost_per_base_unit
            FROM topping_ingredients ti
            LEFT JOIN materials m ON ti.ingredient_type = 'material' AND ti.ingredient_id = m.id
            LEFT JOIN preps p ON ti.ingredient_type = 'prep' AND ti.ingredient_id = p.id
        `);

        // Group ingredients by topping
        const ingMap = {};
        ingredients.forEach(ing => {
            if (!ingMap[ing.topping_id]) ingMap[ing.topping_id] = [];
            ingMap[ing.topping_id].push({
                ingredient_type: ing.ingredient_type,
                ingredient_id: ing.ingredient_id,
                name: ing.name,
                quantity: parseFloat(ing.quantity),
                unit: ing.unit,
                cost_per_base_unit: parseFloat(ing.cost_per_base_unit || 0)
            });
        });

        const admin_toppings = toppings.map(t => ({
            id: t.id,
            name: t.name,
            price: parseFloat(t.price),
            cogs: parseFloat(t.current_cogs),
            ingredients: ingMap[t.id] || []
        }));

        res.json(admin_toppings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const { name, price, ingredients } = req.body;
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const [result] = await connection.query(
            'INSERT INTO toppings (name, price) VALUES (?, ?)',
            [name, price || 0]
        );
        const toppingId = result.insertId;

        if (ingredients && ingredients.length > 0) {
            for (let ing of ingredients) {
                await connection.query(
                    'INSERT INTO topping_ingredients (topping_id, ingredient_type, ingredient_id, quantity) VALUES (?, ?, ?, ?)',
                    [toppingId, ing.ingredient_type, ing.ingredient_id, ing.quantity || 0]
                );
            }
        }
        
        await connection.commit();
        connection.release();
        
        await updateToppingCogs(toppingId);
        
        res.status(201).json({ id: toppingId, message: 'Topping created successfully' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const toppingId = req.params.id;
    const { name, price, ingredients } = req.body;
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        await connection.query('UPDATE toppings SET name = ?, price = ? WHERE id = ?', [name, price || 0, toppingId]);
        
        // Replace ingredients
        await connection.query('DELETE FROM topping_ingredients WHERE topping_id = ?', [toppingId]);
        if (ingredients && ingredients.length > 0) {
            for (let ing of ingredients) {
                await connection.query(
                    'INSERT INTO topping_ingredients (topping_id, ingredient_type, ingredient_id, quantity) VALUES (?, ?, ?, ?)',
                    [toppingId, ing.ingredient_type, ing.ingredient_id, ing.quantity || 0]
                );
            }
        }
        
        await connection.commit();
        connection.release();
        
        await updateToppingCogs(toppingId);
        
        res.json({ message: 'Topping updated successfully' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

async function updateToppingCogs(toppingId) {
    const [ingredients] = await db.query(`
        SELECT ti.quantity, 
               COALESCE(m.cost_per_base_unit, p.current_cost_per_unit) as cost_per_base_unit
        FROM topping_ingredients ti
        LEFT JOIN materials m ON ti.ingredient_type = 'material' AND ti.ingredient_id = m.id
        LEFT JOIN preps p ON ti.ingredient_type = 'prep' AND ti.ingredient_id = p.id
        WHERE ti.topping_id = ?
    `, [toppingId]);

    let totalCogs = 0;
    ingredients.forEach(ing => {
        totalCogs += (ing.quantity * (ing.cost_per_base_unit || 0));
    });

    await db.query('UPDATE toppings SET current_cogs = ? WHERE id = ?', [totalCogs, toppingId]);
}
