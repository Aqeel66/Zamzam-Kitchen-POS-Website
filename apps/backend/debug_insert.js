const db = require('./src/db');

async function testInsert() {
  try {
    console.log('Testing insert into categories...');
    const [result] = await db.query(
      'INSERT INTO categories (name, description, image) VALUES (?, ?, ?)',
      ['Test Category', 'Test Description', null]
    );
    console.log('Insert successful! ID:', result.insertId);
    
    // Clean up
    await db.query('DELETE FROM categories WHERE id = ?', [result.insertId]);
    console.log('Cleanup successful!');
  } catch (err) {
    console.error('Insert FAILED!');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    console.error('Full Error:', err);
  } finally {
    process.exit();
  }
}

testInsert();
