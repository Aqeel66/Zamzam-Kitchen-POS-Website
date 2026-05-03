const db = require('./apps/backend/src/db');

async function updateSchema() {
  try {
    const fieldsToAdd = [
      { name: 'business_name', type: 'VARCHAR(255)' },
      { name: 'business_email', type: 'VARCHAR(255)' },
      { name: 'business_phone', type: 'VARCHAR(50)' },
      { name: 'business_address', type: 'TEXT' }
    ];

    const [columns] = await db.query('SHOW COLUMNS FROM tenant_settings');
    const existingColumns = columns.map(c => c.Field);

    for (const field of fieldsToAdd) {
      if (!existingColumns.includes(field.name)) {
        console.log(`Adding column ${field.name}...`);
        await db.query(`ALTER TABLE tenant_settings ADD COLUMN ${field.name} ${field.type}`);
      } else {
        console.log(`Column ${field.name} already exists.`);
      }
    }

    console.log('Schema updated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  }
}

updateSchema();
