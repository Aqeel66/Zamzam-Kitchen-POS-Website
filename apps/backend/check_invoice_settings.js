const path = require('path');
const db = require('./src/db');

async function checkInvoiceSettings() {
  try {
    const [tenant] = await db.query('SELECT * FROM tenant_settings LIMIT 1');
    const [branch] = await db.query('SELECT * FROM branch_settings WHERE branch_id = 1 LIMIT 1');
    
    console.log('--- Tenant Settings (Branding) ---');
    console.log('Restaurant Name:', tenant[0]?.restaurant_name);
    console.log('Primary Logo:', tenant[0]?.logo_url);
    console.log('Secondary Logo (Halal):', tenant[0]?.secondary_logo_url);
    console.log('Address:', tenant[0]?.business_address);
    console.log('Phone:', tenant[0]?.business_phone);
    console.log('Email:', tenant[0]?.business_email);
    console.log('Tagline:', tenant[0]?.tagline);

    console.log('\n--- Branch Settings ---');
    console.log('Secondary Logo (Halal) override:', branch[0]?.secondary_logo_url);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoiceSettings();
