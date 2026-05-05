const path = require('path');
const db = require('./src/db');

async function checkMenuData() {
  try {
    const [categories] = await db.query('SELECT COUNT(*) as count FROM categories');
    const [items] = await db.query('SELECT COUNT(*) as count FROM menu_items');
    console.log('Categories count:', categories[0].count);
    console.log('Menu items count:', items[0].count);
    
    if (categories[0].count > 0) {
      const [catList] = await db.query('SELECT name FROM categories');
      console.log('Categories:', catList.map(c => c.name).join(', '));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking menu data:', error);
    process.exit(1);
  }
}

checkMenuData();
