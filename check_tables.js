const db = require('./apps/backend/src/db');

async function check() {
  try {
    const [rows] = await db.query('SELECT id, table_number FROM restaurant_tables');
    console.log('Tables from DB:');
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
