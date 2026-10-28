const db = require('../config/db');

// Lấy danh sách các khoản chi (theo ngày hoặc theo tháng)
exports.getAll = async (req, res) => {
    const { date, month } = req.query;
    try {
        let query = 'SELECT id, date, category, amount, description, DATE_FORMAT(created_at, "%H:%i:%s") as time FROM expenses';
        const params = [];

        if (date) {
            query += ' WHERE date = ?';
            params.push(date);
        } else if (month) {
            // month format YYYY-MM
            query += ' WHERE DATE_FORMAT(date, "%Y-%m") = ?';
            params.push(month);
        }

        query += ' ORDER BY id DESC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Tạo khoản chi mới lấy từ két
exports.create = async (req, res) => {
    const { date, category, amount, description } = req.body;

    if (!category || !amount) {
        return res.status(400).json({ error: 'Danh mục và số tiền là bắt buộc' });
    }

    const expenseDate = date || new Date().toISOString().slice(0, 10);

    try {
        const [result] = await db.query(
            'INSERT INTO expenses (date, category, amount, description) VALUES (?, ?, ?, ?)',
            [expenseDate, category, parseFloat(amount), description || '']
        );

        res.status(201).json({
            id: result.insertId,
            date: expenseDate,
            category,
            amount: parseFloat(amount),
            description: description || '',
            message: 'Đã thêm khoản chi thành công'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Xóa khoản chi
exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM expenses WHERE id = ?', [id]);
        res.json({ message: 'Đã xóa khoản chi thành công' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
