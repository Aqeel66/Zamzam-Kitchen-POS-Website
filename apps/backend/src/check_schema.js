const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'apps/backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [rows] = await connection.query('DESCRIBE tenant_settings');
  console.log('Columns in tenant_settings:');
  console.log(rows.map(r => r.Field).join(', '));

  await connection.end();
}

check();
