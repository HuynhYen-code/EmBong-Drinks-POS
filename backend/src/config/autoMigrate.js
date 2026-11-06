const db = require('./db');

async function hasColumn(tableName, columnName) {
    const [cols] = await db.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );
    return cols.length > 0;
}

async function ensureColumn(tableName, columnName, definition) {
    const exists = await hasColumn(tableName, columnName);
    if (!exists) {
        console.log(`[Migration] Adding ${tableName}.${columnName}...`);
        await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
        return true;
    }
    return false;
}

async function ensureIndex(tableName, indexName, columnsDef) {
    const [idx] = await db.query(
        `SELECT INDEX_NAME
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND INDEX_NAME = ?`,
        [tableName, indexName]
    );
    if (idx.length === 0) {
        console.log(`[Migration] Adding index ${indexName} on ${tableName}...`);
        await db.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columnsDef})`);
    }
}

async function autoMigrate() {
    try {
        console.log('[Migration] Checking database schema updates...');

        // 1. Bảng orders: phương thức thanh toán, giảm giá, ghi chú đơn & index thời gian
        await ensureColumn('orders', 'payment_method', "VARCHAR(20) NOT NULL DEFAULT 'cash'");
        await ensureColumn('orders', 'subtotal_amount', 'DECIMAL(12, 2) DEFAULT NULL');
        await ensureColumn('orders', 'discount_amount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0');
        await ensureColumn('orders', 'order_note', 'VARCHAR(255) DEFAULT NULL');
        await ensureIndex('orders', 'idx_orders_created_at', 'created_at');

        // 2. Bảng order_details: ghi chú từng món (ít đá, ít ngọt...) & index order_id
        await ensureColumn('order_details', 'note', 'VARCHAR(255) DEFAULT NULL');
        await ensureIndex('order_details', 'idx_order_details_order_id', 'order_id');

        // 3. Soft-delete (is_active) cho menu_items, menu_item_sizes, toppings để xóa an toàn không mất lịch sử bill
        await ensureColumn('menu_items', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
        await ensureColumn('menu_item_sizes', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
        await ensureColumn('toppings', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');

        // 4. Bảng daily_cash (quản lý tiền trong két theo ngày + cờ nhập tay đầu ngày)
        await db.query(`
            CREATE TABLE IF NOT EXISTS daily_cash (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL UNIQUE,
                initial_cash DECIMAL(12, 2) NOT NULL DEFAULT 0,
                is_manual_initial TINYINT(1) NOT NULL DEFAULT 0,
                actual_ending_cash DECIMAL(12, 2) DEFAULT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        const addedManualFlag = await ensureColumn('daily_cash', 'is_manual_initial', 'TINYINT(1) NOT NULL DEFAULT 0');
        if (addedManualFlag) {
            await db.query('UPDATE daily_cash SET is_manual_initial = 1 WHERE initial_cash > 0');
        }

        // 5. Bảng expenses (quản lý các khoản chi từ két)
        await db.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL,
                category VARCHAR(100) NOT NULL,
                amount DECIMAL(12, 2) NOT NULL,
                description VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await ensureIndex('expenses', 'idx_expenses_date', 'date');

        // 6. Bảng shop_settings (cấu hình VietQR ngân hàng, danh mục tùy chỉnh...)
        await db.query(`
            CREATE TABLE IF NOT EXISTS shop_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 7. Cập nhật phân loại thực đơn cũ sang phân loại mới theo đúng nghiệp vụ
        console.log('[Migration] Updating menu item categories to new standard...');
        
        // 7.1. Cà phê & Cacao -> "Cà Phê - Cacao"
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

        // 7.2. Trà trái cây -> "Trà Trái Cây" (các món trà kết hợp trái cây)
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

        // 7.3. Đổi phân loại cũ 'Trà / Trà Sữa' còn lại sang 'Trà Sữa - Sữa Tươi'
        await db.query(`
            UPDATE menu_items 
            SET category = 'Trà Sữa - Sữa Tươi'
            WHERE category IN ('Trà / Trà Sữa', 'Trà / Trà sữa', 'Trà/Trà Sữa', 'Trà/Trà sữa', 'Trà Sữa', 'Trà sữa', 'Sữa tươi', 'Sua tuoi')
        `);

        // 7.4. Đảm bảo các món trà sữa / sữa tươi cụ thể (như Olong lài sữa, Sữa tươi trân châu đường đen, Sữa dừa sương sáo) vào 'Trà Sữa - Sữa Tươi'
        await db.query(`
            UPDATE menu_items 
            SET category = 'Trà Sữa - Sữa Tươi'
            WHERE (LOWER(name) LIKE '%olong lài sữa%' OR LOWER(name) LIKE '%sữa tươi trân châu%' OR LOWER(name) LIKE '%sữa dừa sương sáo%')
              AND category NOT IN ('Trà Sữa - Sữa Tươi')
        `);

        console.log('[Migration] Database schema and categories are up to date.');
    } catch (err) {
        console.error('[Migration Error]:', err.message);
    }
}

module.exports = autoMigrate;
