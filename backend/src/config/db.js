const mysql = require('mysql2/promise');
require('dotenv').config();

const sslConfig = process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com') 
    ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } 
    : undefined;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    decimalNumbers: true,
    timezone: '+07:00',
    ssl: sslConfig
});

// Thiết lập múi giờ Việt Nam (UTC+7) cho mọi kết nối tới Database
pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+07:00';");
});

module.exports = pool;

