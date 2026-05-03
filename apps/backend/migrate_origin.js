const pool = require('./src/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'db/add_origin.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const queries = sql.split(';').filter(q => q.trim().length > 0);
    
    for (let query of queries) {
      console.log(`Executing: ${query.trim()}`);
      try {
        await pool.query(query);
        console.log('Success');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('Column already exists. Skipping...');
        } else {
          throw err;
        }
      }
    }
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
