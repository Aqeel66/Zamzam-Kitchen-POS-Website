const db = require('../src/db');

async function migrate() {
  try {
    console.log('--- MIGRATION: Creating Expenses Table ---');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT DEFAULT 1,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Expenses table created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
