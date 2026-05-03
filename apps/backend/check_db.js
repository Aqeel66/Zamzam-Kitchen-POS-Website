const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('--- Database Health Check ---');

  const tablesToCheck = ['categories', 'menu_items', 'reservations', 'inventory_items', 'orders'];
  
  for (const table of tablesToCheck) {
    try {
      const [columns] = await connection.query(`DESCRIBE ${table}`);
      console.log(`✅ Table '${table}' exists.`);
      
      const columnNames = columns.map(c => c.Field);
      if (table === 'categories' || table === 'menu_items') {
        if (!columnNames.includes('is_deleted')) {
          console.warn(`❌ Table '${table}' is missing 'is_deleted' column.`);
        } else {
          console.log(`✅ Table '${table}' has 'is_deleted' column.`);
        }
      }
    } catch (err) {
      console.error(`❌ Table '${table}' does NOT exist or error:`, err.message);
    }
  }

  await connection.end();
}

checkDatabaseSchema().catch(console.error);
