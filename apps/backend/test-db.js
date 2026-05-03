const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function testDB() {
  console.log('Testing DB connection...');
  console.log('Host:', process.env.DB_HOST);
  console.log('User:', process.env.DB_USER);
  console.log('DB:', process.env.DB_NAME);
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'zamzam_db'
    });
    console.log('✅ Connection successful!');
    const [rows] = await connection.execute('SELECT 1 as result');
    console.log('Query result:', rows);
    await connection.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testDB();
