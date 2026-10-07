const db = require('../config/db');

// Tính toán lại giá trị của 1 Menu Item Size cụ thể
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
    for (let ing of ings) {
        let cost = 0;
        if (ing.ingredient_type === 'material' && ing.m_cost) cost = ing.m_cost;
        if (ing.ingredient_type === 'prep' && ing.p_cost) cost = ing.p_cost;
        totalCogs += cost * ing.quantity;
    }

    await db.query('UPDATE menu_item_sizes SET current_cogs = ? WHERE id = ?', [totalCogs, sizeId]);
};

// Tính toán lại giá trị của 1 Prep cụ thể (và các Menu Item dùng nó)
const recalculatePrepCost = async (prepId) => {
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

    // Sau khi tính lại giá Prep, tìm tất cả MenuItemSize đang xài Prep này để tính lại COGS
    const [menuSizes] = await db.query('SELECT DISTINCT menu_item_size_id FROM menu_item_size_ingredients WHERE ingredient_type = "prep" AND ingredient_id = ?', [prepId]);
    for (let size of menuSizes) {
        await recalculateMenuItemCogs(size.menu_item_size_id);
    }
};

// Tính toán lại hệ quả khi 1 Material thay đổi
const recalculateFromMaterial = async (materialId) => {
    // 1. Cập nhật các Prep dùng Material này
    const [prepsAffected] = await db.query('SELECT DISTINCT prep_id FROM prep_ingredients WHERE material_id = ?', [materialId]);
    for (let prep of prepsAffected) {
        await recalculatePrepCost(prep.prep_id);
    }

    // 2. Cập nhật các MenuItemSize dùng TRỰC TIẾP Material này
    const [menuSizesAffected] = await db.query('SELECT DISTINCT menu_item_size_id FROM menu_item_size_ingredients WHERE ingredient_type = "material" AND ingredient_id = ?', [materialId]);
    for (let size of menuSizesAffected) {
        await recalculateMenuItemCogs(size.menu_item_size_id);
    }
};

module.exports = {
    recalculateMenuItemCogs,
    recalculatePrepCost,
    recalculateFromMaterial
};
