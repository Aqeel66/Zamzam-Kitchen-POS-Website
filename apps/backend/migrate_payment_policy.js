const db = require('./src/db');

async function migrate() {
  try {
    console.log('Adding payment_policy column to branch_settings...');
    await db.query("ALTER TABLE branch_settings ADD COLUMN payment_policy VARCHAR(20) DEFAULT 'Pay Last'");
    console.log('Column added successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
