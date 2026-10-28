const db = require('./db');

async function autoMigrate() {
    try {
        console.log('[Migration] Checking database schema updates...');

        // 1. Kiểm tra và thêm cột payment_method vào bảng orders nếu chưa có
        const [orderCols] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'orders' 
              AND COLUMN_NAME = 'payment_method'
        `);

        if (orderCols.length === 0) {
            console.log('[Migration] Adding payment_method column to orders table...');
            await db.query(`
                ALTER TABLE orders 
                ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
            `);
            console.log('[Migration] Added payment_method column successfully.');
        }

        // 2. Tạo bảng daily_cash (quản lý tiền trong két theo ngày) nếu chưa có
        await db.query(`
            CREATE TABLE IF NOT EXISTS daily_cash (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL UNIQUE,
                initial_cash DECIMAL(12, 2) NOT NULL DEFAULT 0,
                actual_ending_cash DECIMAL(12, 2) DEFAULT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 3. Tạo bảng expenses (quản lý các khoản chi từ két) nếu chưa có
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

        console.log('[Migration] Database schema is up to date.');
    } catch (err) {
        console.error('[Migration Error]:', err.message);
    }
}

module.exports = autoMigrate;
