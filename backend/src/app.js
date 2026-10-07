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

app.use('/api/materials', materialRoutes);
app.use('/api/preps', prepRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);
const uploadRoutes = require('./routes/uploadRoutes');
const path = require('path');

app.use('/api/toppings', toppingRoutes);
app.use('/api/upload', uploadRoutes);

// Phục vụ ứng dụng Vue Frontend từ thư mục dist (sau khi build)
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all route cho Vue Router
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

module.exports = app;
