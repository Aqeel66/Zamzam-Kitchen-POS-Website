const db = require('./src/db');
async function check() {
  try {
    const [rows] = await db.query('SELECT * FROM tenant_settings LIMIT 1');
    console.log('Tenant Settings:', JSON.stringify(rows[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
