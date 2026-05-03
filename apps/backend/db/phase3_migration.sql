-- Migration: Phase 3 Modules C & D
-- Adds Variants, Extras, Customizations, and Recipes

-- 1. Variants (e.g., Small, Medium, Large)
CREATE TABLE IF NOT EXISTS menu_item_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- 2. Extras (e.g., Add Cheese, No Onions)
CREATE TABLE IF NOT EXISTS menu_item_extras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- 3. Order Item Customizations (What was chosen for a specific order item)
CREATE TABLE IF NOT EXISTS order_item_customizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id INT NOT NULL,
    type ENUM('Variant', 'Extra') NOT NULL,
    customization_name VARCHAR(100) NOT NULL, -- Stored explicitly in case the extra/variant is deleted
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

-- 4. Recipes (Ingredients for a menu item)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    inventory_item_id INT NOT NULL,
    quantity_required DECIMAL(10,4) NOT NULL, -- 4 decimal places for precision (e.g., 0.0150 kg)
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);
