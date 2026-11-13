const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const materialRoutes = require('./routes/materialRoutes');
const prepRoutes = require('./routes/prepRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const orderRoutes = require('./routes/orderRoutes');
const toppingRoutes = require('./routes/toppingRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const cashDrawerRoutes = require('./routes/cashDrawerRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Nén Gzip tự động cho các JSON response lớn (>1KB) giúp giảm ~85% dung lượng truyền tải qua 4G/WiFi
app.use((req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip')) return next();

    const originalJson = res.json.bind(res);
    res.json = (data) => {
        if (res.headersSent) return originalJson(data);
        const jsonStr = JSON.stringify(data);
        if (Buffer.byteLength(jsonStr) < 1024) {
            return originalJson(data);
        }
        zlib.gzip(jsonStr, (err, compressed) => {
            if (err || res.headersSent) {
                return originalJson(data);
            }
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Vary', 'Accept-Encoding');
            res.send(compressed);
        });
        return res;
    };
    next();
});

// Endpoint kiểm tra sức khỏe và chống ngủ đông (Keep-alive cho UptimeRobot / Cron job)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/materials', materialRoutes);
app.use('/api/preps', prepRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/toppings', toppingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cash-drawer', cashDrawerRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settings', settingsRoutes);

// Root endpoint (giúp ping trực tiếp URL chính không bị 404)
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Em Bong POS Backend is running' });
});

// Phục vụ ứng dụng Vue Frontend từ thư mục dist (nếu có build cục bộ)
const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

module.exports = app;
