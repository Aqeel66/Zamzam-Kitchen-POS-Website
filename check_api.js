const axios = require('axios');

async function check() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const url = `http://localhost:5000/api/reservations/available-tables?date=${today}&time=18:00:00`;
    console.log('Fetching from:', url);
    const res = await axios.get(url);
    console.log('API Response status:', res.status);
    console.log('Tables returned:');
    console.log(res.data.tables.map(t => ({ id: t.id, table_number: t.table_number, capacity: t.capacity })));
  } catch (err) {
    console.error('Error fetching API:', err.message);
  }
}

check();
