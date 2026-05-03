const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixImages() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zamzam_db',
  });

  try {
    const mappings = [
      { name: 'Grilled Salmon', image: 'assets/images/menu_items/grilled_salmon.png' },
      { name: 'Mushroom Risotto', image: 'assets/images/menu_items/mushroom_risotto.png' },
      { name: 'Ribeye Steak', image: 'assets/images/menu_items/ribeye_steak.png' },
      { name: 'Wagyu Burger', image: 'assets/images/menu_items/wagyu_burger.png' },
      { name: 'Pasta Carbonara', image: 'assets/images/menu_items/pasta_carbonara.png' },
      { name: 'Butter Naan', image: 'assets/images/menu_items/masala_chai.png' }, // Placeholder or fix if better exists
      { name: 'Mango Lassi', image: 'assets/images/menu_items/masala_chai.png' },
      { name: 'Masala Chai', image: 'assets/images/menu_items/masala_chai.png' },
      { name: 'Pasta Chicken', image: 'assets/images/menu_items/pasta.png' },
      { name: 'Mandi Chicken', image: 'assets/images/menu_items/chicken_biryani.png' },
      { name: 'Barramundi', image: 'assets/images/menu_items/grilled_salmon.png' },
      { name: 'Chicken Biryani', image: 'assets/images/menu_items/chicken_biryani.png' },
    ];

    for (const map of mappings) {
      const [result] = await connection.execute(
        "UPDATE menu_items SET image = ? WHERE name LIKE ?",
        [map.image, `%${map.name}%`]
      );
      console.log(`Updated ${map.name}:`, result.affectedRows);
    }

    // Fix paths for items that already have numeric names but are missing 'assets/' prefix
    const [resultPrefix] = await connection.execute(
      "UPDATE menu_items SET image = CONCAT('assets/', image) WHERE image LIKE 'images/%' AND image NOT LIKE 'assets/%'"
    );
    console.log('Fixed path prefixes:', resultPrefix.affectedRows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixImages();
