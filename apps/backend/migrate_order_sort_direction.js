const db = require('./src/db');

async function migrate() {
  try {
    console.log('Adding order_sort_direction to branch_settings...');
    await db.query("ALTER TABLE branch_settings ADD COLUMN order_sort_direction VARCHAR(20) DEFAULT 'Descending'");
    console.log('Done!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

migrate();
