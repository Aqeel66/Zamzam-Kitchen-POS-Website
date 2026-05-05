const path = require('path');
const db = require('./src/db');

async function debugMenuQuery() {
  try {
    const [catColumns] = await db.query('DESCRIBE categories');
    const hasCatDeleted = catColumns.map(c => c.Field).includes('is_deleted');
    console.log('Categories has is_deleted column:', hasCatDeleted);

    const [itemColumns] = await db.query('DESCRIBE menu_items');
    const hasItemDeleted = itemColumns.map(c => c.Field).includes('is_deleted');
    console.log('Menu Items has is_deleted column:', hasItemDeleted);

    const [categories] = await db.query(`SELECT * FROM categories ${hasCatDeleted ? 'WHERE is_deleted = FALSE' : ''}`);
    console.log('Categories found with is_deleted filter:', categories.length);

    if (categories.length === 0 && hasCatDeleted) {
        const [allCats] = await db.query('SELECT * FROM categories');
        console.log('Total categories (ignoring filter):', allCats.length);
        console.log('Sample category is_deleted values:', allCats.slice(0, 5).map(c => c.is_deleted));
    }

    const [items] = await db.query(`SELECT * FROM menu_items ${hasItemDeleted ? 'WHERE is_deleted = FALSE' : ''}`);
    console.log('Items found with is_deleted filter:', items.length);

    process.exit(0);
  } catch (error) {
    console.error('Error debugging menu query:', error);
    process.exit(1);
  }
}

debugMenuQuery();
