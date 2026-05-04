const db = require('./src/db');

async function checkTables() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    console.log('Tables in database:', tables);
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const [columns] = await db.query(`DESCRIBE ${tableName}`);
      console.log(`\nTable: ${tableName}`);
      console.table(columns);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();
