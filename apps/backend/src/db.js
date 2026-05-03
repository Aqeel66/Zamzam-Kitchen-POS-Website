const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config(); // Load from .env if it exists, but don't force path

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00' // Use UTC for consistency on server
});

// Test connection on startup but don't crash
pool.getConnection()
  .then(conn => {
    console.log('✅ DATABASE CONNECTED: Successfully connected to', process.env.DB_NAME, 'at', process.env.DB_HOST);
    conn.release();
  })
  .catch(err => {
    console.error('❌ DATABASE CONNECTION FAILED!');
    console.error('   Error Code:', err.code);
    console.error('   Error Message:', err.message);
    console.error('   Target Host:', process.env.DB_HOST || 'localhost');
    console.error('   Target User:', process.env.DB_USER || 'root');
    console.warn('⚠️ Server will stay running, but API calls will fail until DB is fixed.');
  });

module.exports = pool;
