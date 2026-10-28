const express = require('express');
const cors = require('cors');

const materialRoutes = require('./routes/materialRoutes');
const prepRoutes = require('./routes/prepRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const orderRoutes = require('./routes/orderRoutes');
const toppingRoutes = require('./routes/toppingRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Endpoint kiểm tra sức khỏe và chống ngủ đông (Keep-alive cho UptimeRobot / Cron job)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/materials', materialRoutes);
app.use('/api/preps', prepRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);
const uploadRoutes = require('./routes/uploadRoutes');
const path = require('path');

const cashDrawerRoutes = require('./routes/cashDrawerRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

app.use('/api/toppings', toppingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cash-drawer', cashDrawerRoutes);
app.use('/api/expenses', expenseRoutes);

const fs = require('fs');

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
