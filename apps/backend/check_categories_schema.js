const db = require('./src/db');

async function checkCategories() {
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM categories');
    console.log('Categories Table Columns:', JSON.stringify(columns, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error checking categories table:', error);
    process.exit(1);
  }
}

checkCategories();
