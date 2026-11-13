const db = require('./db');

const CURRENT_SCHEMA_VERSION = '2026_11_13_v1';

async function autoMigrate() {
    try {
        // Kiểm tra nhanh phiên bản migration để tránh chạy 15+ truy vấn INFORMATION_SCHEMA mỗi lần cold start
        try {
            const [verRows] = await db.query(
                "SELECT setting_value FROM shop_settings WHERE setting_key = 'schema_migration_version' LIMIT 1"
            );
            if (verRows.length > 0 && verRows[0].setting_value === CURRENT_SCHEMA_VERSION) {
                console.log('[Migration] Schema already up to date (fast path).');
                return;
            }
        } catch (ignoreErr) {
            // Bảng shop_settings chưa tồn tại -> chạy migration đầy đủ bên dưới
        }

        console.log('[Migration] Checking database schema updates...');

        // Đọc toàn bộ metadata bảng, cột, chỉ mục chỉ trong 1 lượt Promise.all
        const [[tableRows], [colRows], [idxRows]] = await Promise.all([
            db.query(
                `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME IN ('daily_cash', 'expenses', 'shop_settings')`
            ),
            db.query(
                `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME IN ('orders', 'order_details', 'menu_items', 'menu_item_sizes', 'toppings', 'daily_cash')`
            ),
            db.query(
                `SELECT TABLE_NAME, INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME IN ('orders', 'order_details', 'expenses', 'menu_item_sizes')`
            )
        ]);

        const existingTables = new Set(tableRows.map(r => r.TABLE_NAME));
        const hasCol = (table, col) => colRows.some(r => r.TABLE_NAME === table && r.COLUMN_NAME === col);
        const hasIdx = (table, idx) => idxRows.some(r => r.TABLE_NAME === table && r.INDEX_NAME === idx);

        const ensureCol = async (table, col, def) => {
            if (!hasCol(table, col)) {
                console.log(`[Migration] Adding ${table}.${col}...`);
                await db.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
                return true;
            }
            return false;
        };

        const ensureIdx = async (table, idx, colsDef) => {
            if (!hasIdx(table, idx)) {
                console.log(`[Migration] Adding index ${idx} on ${table}...`);
                await db.query(`ALTER TABLE ${table} ADD INDEX ${idx} (${colsDef})`);
            }
        };

        // 1. Bảng orders & order_details
        await ensureCol('orders', 'payment_method', "VARCHAR(20) NOT NULL DEFAULT 'cash'");
        await ensureCol('orders', 'subtotal_amount', 'DECIMAL(12, 2) DEFAULT NULL');
        await ensureCol('orders', 'discount_amount', 'DECIMAL(12, 2) NOT NULL DEFAULT 0');
        await ensureCol('orders', 'order_note', 'VARCHAR(255) DEFAULT NULL');
        await ensureIdx('orders', 'idx_orders_created_at', 'created_at');
        await ensureIdx('orders', 'idx_orders_created_payment', 'created_at, payment_method, total_amount');

        await ensureCol('order_details', 'note', 'VARCHAR(255) DEFAULT NULL');
        await ensureIdx('order_details', 'idx_order_details_order_id', 'order_id');

        // 2. Soft-delete (is_active) & index
        await ensureCol('menu_items', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
        await ensureCol('menu_item_sizes', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
        await ensureIdx('menu_item_sizes', 'idx_menu_item_sizes_active', 'menu_item_id, is_active');
        await ensureCol('toppings', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');

        // 3. Bảng daily_cash, expenses, shop_settings
        if (!existingTables.has('daily_cash')) {
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
        } else {
            const addedManualFlag = await ensureCol('daily_cash', 'is_manual_initial', 'TINYINT(1) NOT NULL DEFAULT 0');
            if (addedManualFlag) {
                await db.query('UPDATE daily_cash SET is_manual_initial = 1 WHERE initial_cash > 0');
            }
        }

        if (!existingTables.has('expenses')) {
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
        }
        await ensureIdx('expenses', 'idx_expenses_date', 'date');

        if (!existingTables.has('shop_settings')) {
            await db.query(`
                CREATE TABLE IF NOT EXISTS shop_settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
        }

        // 4. Chuẩn hóa phân loại thực đơn
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

        await db.query(`
            UPDATE menu_items 
            SET category = 'Trà Trái Cây'
            WHERE (
                category IN ('Trà / Trà Sữa', 'Trà / Trà sữa', 'Trà/Trà Sữa', 'Trà/Trà sữa', 'Trà', 'Khác')
                OR category LIKE '%Trà%'
            )
            AND (
                LOWER(name) LIKE '%trà đào%' OR LOWER(name) LIKE '%tra dao%'
                OR LOWER(name) LIKE '%trà dâu%' OR LOWER(name) LIKE '%tra dau%'
                OR LOWER(name) LIKE '%trà nho%' OR LOWER(name) LIKE '%tra nho%'
                OR LOWER(name) LIKE '%trà kiwi%' OR LOWER(name) LIKE '%tra kiwi%'
                OR LOWER(name) LIKE '%trà ổi%' OR LOWER(name) LIKE '%tra oi%'
                OR LOWER(name) LIKE '%trà chanh%' OR LOWER(name) LIKE '%tra chanh%'
                OR LOWER(name) LIKE '%trà tắc%' OR LOWER(name) LIKE '%tra tac%'
                OR LOWER(name) LIKE '%trà việt quất%' OR LOWER(name) LIKE '%tra viet quat%'
                OR LOWER(name) LIKE '%trà mãng cầu%' OR LOWER(name) LIKE '%tra mang cau%'
                OR LOWER(name) LIKE '%trà vải%' OR LOWER(name) LIKE '%tra vai%'
                OR LOWER(name) LIKE '%trà xoài%' OR LOWER(name) LIKE '%tra xoai%'
                OR LOWER(name) LIKE '%trà bưởi%' OR LOWER(name) LIKE '%tra buoi%'
                OR LOWER(name) LIKE '%trà thơm%' OR LOWER(name) LIKE '%trà dứa%'
                OR LOWER(name) LIKE '%trà táo%' OR LOWER(name) LIKE '%trà lựu%'
                OR LOWER(name) LIKE '%trà dưa lưới%' OR LOWER(name) LIKE '%trà thanh long%'
                OR LOWER(name) LIKE '%trà sen%' OR LOWER(name) LIKE '%trà trái cây%'
                OR LOWER(name) LIKE '%trà hoa quả%'
            )
            AND LOWER(name) NOT LIKE '%sữa%'
            AND LOWER(name) NOT LIKE '%sua%'
            AND LOWER(name) NOT LIKE '%latte%'
        `);

        await db.query(`
            UPDATE menu_items 
            SET category = 'Trà Sữa - Sữa Tươi'
            WHERE category IN ('Trà / Trà Sữa', 'Trà / Trà sữa', 'Trà/Trà Sữa', 'Trà/Trà sữa', 'Trà Sữa', 'Trà sữa', 'Sữa tươi', 'Sua tuoi')
        `);

        await db.query(`
            UPDATE menu_items 
            SET category = 'Trà Sữa - Sữa Tươi'
            WHERE (LOWER(name) LIKE '%olong lài sữa%' OR LOWER(name) LIKE '%sữa tươi trân châu%' OR LOWER(name) LIKE '%sữa dừa sương sáo%')
              AND category NOT IN ('Trà Sữa - Sữa Tươi')
        `);

        // Lưu lại phiên bản đã migrate để các lần cold start sau chỉ tốn 1 query
        await db.query(
            `INSERT INTO shop_settings (setting_key, setting_value)
             VALUES ('schema_migration_version', ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [CURRENT_SCHEMA_VERSION]
        );

        console.log('[Migration] Database schema and categories are up to date.');
    } catch (err) {
        console.error('[Migration Warning]', err.message);
    }
}

module.exports = autoMigrate;
