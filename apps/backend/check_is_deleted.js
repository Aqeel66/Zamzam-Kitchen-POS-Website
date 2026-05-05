const path = require('path');
const db = require('./src/db');

async function checkIsDeletedValues() {
  try {
    const [catCols] = await db.query('DESCRIBE categories');
    console.log('Categories Columns:', catCols.filter(c => c.Field === 'is_deleted'));
    
    const [cats] = await db.query('SELECT id, name, is_deleted FROM categories');
    console.log('Categories is_deleted data:', cats.map(c => ({ id: c.id, name: c.name, val: c.is_deleted })));

    const [itemCols] = await db.query('DESCRIBE menu_items');
    console.log('Menu Items Columns:', itemCols.filter(c => c.Field === 'is_deleted'));

    const [items] = await db.query('SELECT id, name, is_deleted FROM menu_items LIMIT 5');
    console.log('Menu Items is_deleted data (sample):', items.map(i => ({ id: i.id, name: i.name, val: i.is_deleted })));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkIsDeletedValues();
