const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'apps/backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [rows] = await connection.query('SELECT id, name, is_featured, badge FROM menu_items');
  console.log('--- Menu Items Featured Status ---');
  rows.forEach(row => {
    if (row.is_featured) {
        console.log(`✅ [FEATURED] ${row.name} (ID: ${row.id}, Raw Value: ${row.is_featured})`);
    } else {
        // console.log(`❌ [NOT FEATURED] ${row.name}`);
    }
  });
  
  const featuredCount = rows.filter(r => r.is_featured).length;
  console.log(`\nTotal Featured Items: ${featuredCount}`);
  if (featuredCount === 0) {
      console.log('⚠️ WARNING: No items are marked as featured in the database.');
  }

  await connection.end();
}

check();
