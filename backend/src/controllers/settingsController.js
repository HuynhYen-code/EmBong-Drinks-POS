const db = require('../config/db');

const DEFAULT_SETTINGS = {
    bank_bin: '',
    bank_short_name: 'MBBank',
    account_no: '',
    account_name: '',
    shop_name: 'Em Bông',
    custom_categories: '[]'
};

exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value FROM shop_settings');
        const result = { ...DEFAULT_SETTINGS };
        for (const r of rows) {
            result[r.setting_key] = r.setting_value;
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSettings = async (req, res) => {
    const payload = req.body || {};
    const keys = Object.keys(payload);
    if (keys.length === 0) {
        return res.json({ message: 'Không có thay đổi' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const key of keys) {
            const rawVal = payload[key];
            const strVal = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal ?? '');
            await connection.query(
                `INSERT INTO shop_settings (setting_key, setting_value)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                [key.slice(0, 100), strVal]
            );
        }
        await connection.commit();
        connection.release();
        res.json({ message: 'Đã lưu cấu hình cửa hàng thành công' });
    } catch (err) {
        await connection.rollback();
        connection.release();
        res.status(500).json({ error: err.message });
    }
};

