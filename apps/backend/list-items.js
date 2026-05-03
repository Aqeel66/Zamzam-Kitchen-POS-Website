const mysql = require('mysql2/promise');
require('dotenv').config();

async function listMenuItems() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'zamzam_db',
  });

  try {
    const [rows] = await connection.execute('SELECT id, name, image FROM menu_items');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

listMenuItems();
