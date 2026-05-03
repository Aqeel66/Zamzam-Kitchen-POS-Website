const db = require('./apps/backend/src/db');

async function checkSchema() {
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM tenant_settings');
    console.log('Current columns in tenant_settings:', columns.map(c => c.Field));
    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();
