const db = require('./apps/backend/src/db');

async function checkData() {
  try {
    const [rows] = await db.query('SELECT * FROM tenant_settings');
    console.log('Rows in tenant_settings:', rows);
    process.exit(0);
  } catch (error) {
    console.error('Error checking data:', error);
    process.exit(1);
  }
}

checkData();
