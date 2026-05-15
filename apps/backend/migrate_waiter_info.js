const db = require('./src/db');

async function migrate() {
  try {
    console.log('Starting migration: adding waiter_id and waiter_name to orders table...');
    
    // Check if columns already exist
    const [columns] = await db.query('DESCRIBE orders');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('waiter_id')) {
      await db.query('ALTER TABLE orders ADD COLUMN waiter_id INT DEFAULT NULL');
      console.log('Added waiter_id column');
    }

    if (!columnNames.includes('waiter_name')) {
      await db.query('ALTER TABLE orders ADD COLUMN waiter_name VARCHAR(100) DEFAULT NULL');
      console.log('Added waiter_name column');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
