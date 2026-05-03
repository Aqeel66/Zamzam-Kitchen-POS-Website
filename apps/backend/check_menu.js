const axios = require('axios');

async function checkMenu() {
  try {
    const response = await axios.get('http://localhost:5000/api/menu');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMenu();
