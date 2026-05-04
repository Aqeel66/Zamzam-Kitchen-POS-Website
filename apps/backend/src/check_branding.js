const pool = require('./db');

async function checkBranding() {
  try {
    const [rows] = await pool.execute('SELECT logo_url, secondary_logo_url, theme_mode, restaurant_name, tagline FROM tenant_settings LIMIT 1');
    console.log('Branding Data:', JSON.stringify(rows[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkBranding();
