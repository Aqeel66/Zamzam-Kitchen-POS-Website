const db = require('./src/db');

async function checkTriggers() {
  try {
    const [triggers] = await db.query('SHOW TRIGGERS');
    console.log('Triggers:', JSON.stringify(triggers, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Failed to fetch triggers:', error.message);
    process.exit(1);
  }
}

checkTriggers();
