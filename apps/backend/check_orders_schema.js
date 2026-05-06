const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZKpos@db26#',
    database: 'zamzam_db'
  });

  try {
    const [rows] = await connection.execute('DESCRIBE reservations');
    console.log('Schema for reservations:');
    rows.forEach(row => console.log(row.Field));
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
