-- Update categories to match user request
USE zamzam_db;

-- Disable foreign key checks to allow clearing items
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE menu_items;
TRUNCATE TABLE categories;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO categories (id, name, description) VALUES 
(1, 'Mandi', 'Traditional Yemeni rice and meat dishes'),
(2, 'Pasta', 'Fresh Italian-style pasta dishes'),
(3, 'Individuals', 'Single portion meals and specials'),
(4, 'Sides', 'Accompaniments and extra portions'),
(5, 'Breads', 'Freshly baked naan and roti'),
(6, 'Drinks/Tea', 'Cold beverages and traditional teas'),
(7, 'Desserts', 'Sweet treats and after-meal delights');

-- Add some sample items for these new categories
-- Using allowed ENUM values for prep_station: 'Bar', 'Grill', 'Fryer', 'Salad', 'Dessert', 'General'
INSERT INTO menu_items (category_id, name, description, price, is_available, prep_station, image) VALUES 
(1, 'Lamb Mandi', 'Tender slow-cooked lamb served over aromatic basmati rice', 22.50, TRUE, 'General', 'assets/images/menu_items/chicken_biryani.png'),
(1, 'Chicken Mandi', 'Traditional mandi chicken with rice and special sauce', 18.00, TRUE, 'General', 'assets/images/menu_items/chicken_biryani.png'),
(2, 'Penne Arrabbiata', 'Pasta in a spicy tomato and garlic sauce', 14.50, TRUE, 'General', 'assets/images/menu_items/pasta.png'),
(3, 'Mix Grill Platter', 'Assorted grilled meats for one person', 26.00, TRUE, 'Grill', 'assets/images/menu_items/ribeye_steak.png'),
(4, 'Tabbouleh', 'Fresh parsley and bulgur salad', 6.00, TRUE, 'Salad', 'assets/images/menu_items/salad.png'),
(5, 'Butter Naan', 'Leavened bread baked in tandoor with butter', 2.50, TRUE, 'Grill', 'assets/images/menu_items/masala_chai.png'),
(6, 'Adeni Tea', 'Traditional Yemeni spiced milk tea', 3.50, TRUE, 'Bar', 'assets/images/menu_items/masala_chai.png'),
(7, 'Kunafa', 'Middle Eastern cheese pastry soaked in sweet syrup', 8.50, TRUE, 'Dessert', 'assets/images/menu_items/tiramisu.png');
