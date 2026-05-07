const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * Automates Database Schema Synchronization
 * 1. Reads db/schema.sql
 * 2. Ensures all tables exist
 * 3. Ensures all columns defined in schema.sql exist in the live database
 * 4. Runs initial data inserts
 */
async function syncSchema() {
  try {
    console.log('🛠️ Starting Database Auto-Sync...');
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.warn('⚠️ schema.sql not found at', schemaPath);
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // 1. Extract and sync CREATE TABLE blocks
    const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]+?)\);/g;
    let match;

    while ((match = tableRegex.exec(schemaSql)) !== null) {
      const tableName = match[1];
      const columnDefinitions = match[2].trim();

      // Ensure the table itself exists
      await db.query(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefinitions})`);

      // Check for missing columns within the table
      const lines = columnDefinitions.split('\n');
      for (let line of lines) {
        line = line.trim().replace(/,$/, ''); // Clean up line
        
        // Skip constraints and empty lines
        if (!line || 
            line.startsWith('--') || 
            line.toUpperCase().startsWith('PRIMARY KEY') || 
            line.toUpperCase().startsWith('FOREIGN KEY') || 
            line.toUpperCase().startsWith('UNIQUE') ||
            line.toUpperCase().startsWith('KEY') ||
            line.toUpperCase().startsWith('CONSTRAINT')) {
          continue;
        }

        const parts = line.split(/\s+/);
        const columnName = parts[0].replace(/`/g, ''); // Remove backticks if any

        // Check if column exists in live DB
        try {
          const [cols] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
          if (cols.length === 0) {
            console.log(`➕ Auto-Sync: Adding missing column [${columnName}] to table [${tableName}]`);
            // Add the column using the full definition line from SQL
            await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${line}`);
          }
        } catch (colErr) {
          console.error(`❌ Failed to sync column ${columnName} in ${tableName}:`, colErr.message);
        }
      }
    }

    // 2. Handle INSERT IGNORE statements for default data
    const insertRegex = /INSERT IGNORE INTO ([\s\S]+?);/g;
    while ((match = insertRegex.exec(schemaSql)) !== null) {
      try {
        await db.query(`INSERT IGNORE INTO ${match[1]}`);
      } catch (insErr) {
        // console.warn(`⚠️ Insert ignored or failed:`, insErr.message);
      }
    }

    console.log('✅ Database Auto-Sync complete. System is up to date.');
  } catch (err) {
    console.error('🔥 CRITICAL: Database Auto-Sync failed!', err);
  }
}

module.exports = syncSchema;
