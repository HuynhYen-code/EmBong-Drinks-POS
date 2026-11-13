require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/db');
const autoMigrate = require('./src/config/autoMigrate');

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        // Mở sẵn kết nối TLS tới TiDB Cloud ngay khi khởi động để request đầu tiên không bị trễ
        await db.query('SELECT 1');
        await autoMigrate();
    } catch (err) {
        console.error('[Startup Warning]', err.message);
    }
});
