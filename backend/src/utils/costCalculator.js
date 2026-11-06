const db = require('../config/db');

// Tính toán lại giá vốn của 1 Topping cụ thể
const recalculateToppingCogs = async (toppingId) => {
    const [ingredients] = await db.query(`
        SELECT ti.quantity,
               COALESCE(m.cost_per_base_unit, p.current_cost_per_unit) as cost_per_base_unit
        FROM topping_ingredients ti
        LEFT JOIN materials m ON ti.ingredient_type = 'material' AND ti.ingredient_id = m.id
        LEFT JOIN preps p ON ti.ingredient_type = 'prep' AND ti.ingredient_id = p.id
        WHERE ti.topping_id = ?
    `, [toppingId]);

    let totalCogs = 0;
    for (const ing of ingredients) {
        totalCogs += (parseFloat(ing.quantity) || 0) * (parseFloat(ing.cost_per_base_unit) || 0);
    }

    await db.query('UPDATE toppings SET current_cogs = ? WHERE id = ?', [totalCogs, toppingId]);
};

// Tính toán lại giá vốn của 1 Menu Item Size cụ thể
const recalculateMenuItemCogs = async (sizeId) => {
    const [ings] = await db.query(`
        SELECT misi.ingredient_type, misi.ingredient_id, misi.quantity,
               m.cost_per_base_unit as m_cost,
               p.current_cost_per_unit as p_cost
        FROM menu_item_size_ingredients misi
        LEFT JOIN materials m ON misi.ingredient_type = 'material' AND misi.ingredient_id = m.id
        LEFT JOIN preps p ON misi.ingredient_type = 'prep' AND misi.ingredient_id = p.id
        WHERE misi.menu_item_size_id = ?
    `, [sizeId]);

    let totalCogs = 0;
    for (const ing of ings) {
        let cost = 0;
        if (ing.ingredient_type === 'material' && ing.m_cost) cost = parseFloat(ing.m_cost) || 0;
        if (ing.ingredient_type === 'prep' && ing.p_cost) cost = parseFloat(ing.p_cost) || 0;
        totalCogs += cost * (parseFloat(ing.quantity) || 0);
    }

    await db.query('UPDATE menu_item_sizes SET current_cogs = ? WHERE id = ?', [totalCogs, sizeId]);
};

// Tính toán lại giá vốn của 1 Prep cụ thể (và các Menu Item + Topping dùng nó)
const recalculatePrepCost = async (prepId) => {
    const [ingredients] = await db.query(`
        SELECT pi.quantity, m.cost_per_base_unit
        FROM prep_ingredients pi
        JOIN materials m ON pi.material_id = m.id
        WHERE pi.prep_id = ?
    `, [prepId]);

    let totalCost = 0;
    ingredients.forEach(ing => {
        totalCost += (parseFloat(ing.quantity) || 0) * (parseFloat(ing.cost_per_base_unit) || 0);
    });

    const [prepRows] = await db.query('SELECT yield_quantity FROM preps WHERE id = ?', [prepId]);
    if (prepRows.length > 0) {
        const yieldQty = parseFloat(prepRows[0].yield_quantity) || 0;
        const newCostPerUnit = yieldQty > 0 ? (totalCost / yieldQty).toFixed(4) : 0;
        await db.query('UPDATE preps SET current_cost_per_unit = ? WHERE id = ?', [newCostPerUnit, prepId]);
    }

    const [menuSizes, toppingsAffected] = await Promise.all([
        db.query('SELECT DISTINCT menu_item_size_id FROM menu_item_size_ingredients WHERE ingredient_type = "prep" AND ingredient_id = ?', [prepId]),
        db.query('SELECT DISTINCT topping_id FROM topping_ingredients WHERE ingredient_type = "prep" AND ingredient_id = ?', [prepId])
    ]);

    await Promise.all([
        ...menuSizes[0].map(size => recalculateMenuItemCogs(size.menu_item_size_id)),
        ...toppingsAffected[0].map(top => recalculateToppingCogs(top.topping_id))
    ]);
};

// Tính toán lại hệ quả khi 1 Material thay đổi
const recalculateFromMaterial = async (materialId) => {
    // 1. Cập nhật các Prep dùng Material này (tự động kéo theo MenuItem & Topping dùng Prep đó)
    const [prepsAffected] = await db.query('SELECT DISTINCT prep_id FROM prep_ingredients WHERE material_id = ?', [materialId]);
    for (const prep of prepsAffected) {
        await recalculatePrepCost(prep.prep_id);
    }

    // 2. Cập nhật các MenuItemSize & Topping dùng TRỰC TIẾP Material này
    const [menuSizesAffected, toppingsAffected] = await Promise.all([
        db.query('SELECT DISTINCT menu_item_size_id FROM menu_item_size_ingredients WHERE ingredient_type = "material" AND ingredient_id = ?', [materialId]),
        db.query('SELECT DISTINCT topping_id FROM topping_ingredients WHERE ingredient_type = "material" AND ingredient_id = ?', [materialId])
    ]);

    await Promise.all([
        ...menuSizesAffected[0].map(size => recalculateMenuItemCogs(size.menu_item_size_id)),
        ...toppingsAffected[0].map(top => recalculateToppingCogs(top.topping_id))
    ]);
};

module.exports = {
    recalculateToppingCogs,
    recalculateMenuItemCogs,
    recalculatePrepCost,
    recalculateFromMaterial
};
