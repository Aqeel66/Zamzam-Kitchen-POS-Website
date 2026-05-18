-- Zamam Kitchen Complete MySQL DDL Schema

CREATE TABLE tenant_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    theme_mode ENUM('Light', 'Dark', 'Adaptive', 'Midnight Blue', 'Emerald Green', 'Aura Purple') DEFAULT 'Adaptive',
    primary_accent_color VARCHAR(10) DEFAULT '#F15A24',
    typography_primary VARCHAR(50) DEFAULT 'Manrope',
    typography_secondary VARCHAR(50) DEFAULT 'Inter',
    currency VARCHAR(10) DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE role_permissions (
    role_id INT,
    permission_id INT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id INT,
    role_id INT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    contact_number VARCHAR(20),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branch_settings (
    branch_id INT PRIMARY KEY,
    kds_timer_minutes INT DEFAULT 15,
    allow_qr_pay BOOLEAN DEFAULT TRUE,
    flexible_bill_splitting BOOLEAN DEFAULT TRUE,
    gratuity_percentage DECIMAL(5,2) DEFAULT 0.00,
    enable_inventory BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    reliability_score INT DEFAULT 100
);

CREATE TABLE inventory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    quantity DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20),
    low_stock_threshold DECIMAL(10,2) DEFAULT 10,
    supplier_id INT,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    supplier_id INT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Approved', 'Received', 'Cancelled') DEFAULT 'Pending',
    total_amount DECIMAL(10,2),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE wastage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inventory_item_id INT,
    user_id INT,
    quantity DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255),
    log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    dietary_info VARCHAR(255),
    prep_station ENUM('Bar', 'Grill', 'Fryer', 'Salad', 'Dessert', 'General') DEFAULT 'General',
    quantity DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE restaurant_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    table_number VARCHAR(10) NOT NULL,
    capacity INT NOT NULL,
    status ENUM('Available', 'Occupied', 'Reserved', 'Needs Clearing') DEFAULT 'Available',
    pos_x DECIMAL(10,2) DEFAULT 0,
    pos_y DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    dietary_profile VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- Gold, Silver, Bronze
    points_threshold INT NOT NULL,
    multiplier DECIMAL(4,2) DEFAULT 1.00
);

CREATE TABLE points_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    points_earned INT DEFAULT 0,
    points_redeemed INT DEFAULT 0,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATETIME,
    end_date DATETIME,
    point_multiplier DECIMAL(4,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE promo_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type ENUM('Percentage', 'Fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_spend DECIMAL(10,2) DEFAULT 0.00,
    valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    table_id INT NULL, -- Assigned table
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INT NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Seated', 'Cancelled', 'No-Show') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    table_id INT,
    customer_id INT NULL,
    user_id INT, -- Staff who took the order
    session_id VARCHAR(50), -- To group multiple orders for one table sitting
    order_type ENUM('Dine-In', 'Takeaway', 'Delivery') DEFAULT 'Dine-In',
    status ENUM('Pending', 'Preparing', 'Ready', 'Served', 'Paid', 'Cancelled', 'Rejected') DEFAULT 'Pending',
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    rejection_reason TEXT,
    origin VARCHAR(50) DEFAULT 'In-Store',
    order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    menu_item_id INT,
    quantity INT DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    notes TEXT,
    kds_status ENUM('Pending', 'Cooking', 'Done') DEFAULT 'Pending',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tip_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE staff_shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    branch_id INT NOT NULL,
    clock_in DATETIME NOT NULL,
    clock_out DATETIME,
    hourly_rate DECIMAL(10,2),
    status ENUM('Active', 'Ended') DEFAULT 'Active',
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE delivery_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNIQUE NOT NULL,
    delivery_address TEXT NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_notes TEXT,
    courier_id INT, -- Refers to users table if internal, or nullable if external
    estimated_delivery_time DATETIME,
    actual_delivery_time DATETIME,
    status ENUM('Pending', 'Out for Delivery', 'Delivered', 'Failed') DEFAULT 'Pending',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (courier_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NULL,
    user_id INT NULL, 
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

