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
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    ssl: sslConfig
});

module.exports = pool;
