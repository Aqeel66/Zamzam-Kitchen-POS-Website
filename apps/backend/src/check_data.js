const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'apps/backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [rows] = await connection.query('SELECT * FROM tenant_settings');
  console.log('Data in tenant_settings:');
  console.log(JSON.stringify(rows[0], null, 2));

  await connection.end();
}

check();
