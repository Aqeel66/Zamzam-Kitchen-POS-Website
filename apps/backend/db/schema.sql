-- ============================================================
-- Zamzam Kitchen — Full MySQL Schema
-- Run this to initialize the entire database
-- ============================================================

CREATE DATABASE IF NOT EXISTS zamzam_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE zamzam_db;

-- ─── SETTINGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_name VARCHAR(100) DEFAULT 'ZAMZAM KITCHEN',
    theme_mode ENUM('Light', 'Dark', 'Adaptive') DEFAULT 'Adaptive',
    primary_accent_color VARCHAR(10) DEFAULT '#F15A24',
    logo_url VARCHAR(255) DEFAULT NULL,
    secondary_logo_url VARCHAR(255) DEFAULT NULL,
    login_background_url VARCHAR(255) DEFAULT NULL,
    hero_background_url VARCHAR(255) DEFAULT NULL,
    tagline VARCHAR(255) DEFAULT NULL,
    typography_primary VARCHAR(50) DEFAULT 'Manrope',
    typography_secondary VARCHAR(50) DEFAULT 'Inter',
    currency VARCHAR(10) DEFAULT 'USD',
    business_name VARCHAR(100) DEFAULT NULL,
    business_email VARCHAR(255) DEFAULT NULL,
    business_phone VARCHAR(20) DEFAULT NULL,
    business_address TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── ROLES & PERMISSIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT,
    permission_id INT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT,
    role_id INT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ─── BRANCHES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    contact_number VARCHAR(20),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branch_settings (
    branch_id INT PRIMARY KEY,
    kds_timer_minutes INT DEFAULT 15,
    allow_qr_pay BOOLEAN DEFAULT TRUE,
    flexible_bill_splitting BOOLEAN DEFAULT TRUE,
    gratuity_percentage DECIMAL(5,2) DEFAULT 0.00,
    booking_fee_amount DECIMAL(10,2) DEFAULT 10.00,
    is_booking_fee_enabled BOOLEAN DEFAULT TRUE,
    order_sort_direction VARCHAR(20) DEFAULT 'Descending',
    allow_delivery TINYINT(1) DEFAULT 1,
    allow_pickup TINYINT(1) DEFAULT 1,
    is_tax_enabled TINYINT(1) DEFAULT 1,
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    payment_policy VARCHAR(50) DEFAULT 'Pay Last',
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- ─── INVENTORY ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    reliability_score INT DEFAULT 100
);

CREATE TABLE IF NOT EXISTS inventory_items (
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

-- ─── MENU ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured TINYINT(1) DEFAULT 0,
    badge VARCHAR(50) DEFAULT NULL,
    dietary_info VARCHAR(255),
    prep_station ENUM('Bar', 'Grill', 'Fryer', 'Salad', 'Dessert', 'General') DEFAULT 'General',
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ─── TABLES & FLOOR PLAN ────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    table_number VARCHAR(10) NOT NULL,
    capacity INT NOT NULL,
    status ENUM('Available', 'Occupied', 'Reserved', 'Needs Clearing') DEFAULT 'Available',
    pos_x DECIMAL(10,2) DEFAULT 0,
    pos_y DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ─── CUSTOMERS & LOYALTY ────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    origin VARCHAR(50) DEFAULT 'In-Store',
    dietary_profile VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    points_threshold INT NOT NULL,
    multiplier DECIMAL(4,2) DEFAULT 1.00
);

CREATE TABLE IF NOT EXISTS points_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    points_earned INT DEFAULT 0,
    points_redeemed INT DEFAULT 0,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- ─── PROMOTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATETIME,
    end_date DATETIME,
    point_multiplier DECIMAL(4,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type ENUM('Percentage', 'Fixed') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_spend DECIMAL(10,2) DEFAULT 0.00,
    valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME,
    is_active BOOLEAN DEFAULT TRUE
);

-- ─── RESERVATIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    -- Website booking fields
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    customer_name VARCHAR(100),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(20),
    table_id INT NULL,
    reservation_date DATE,
    reservation_time TIME,
    reservation_time_dt DATETIME,
    party_size INT NOT NULL,
    origin VARCHAR(50) DEFAULT 'In-Store',
    booking_fee DECIMAL(10,2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'Pending',
    payment_method VARCHAR(50) DEFAULT 'Counter',
    customer_id INT DEFAULT NULL,
    status ENUM('Pending', 'Confirmed', 'Seated', 'Cancelled', 'No-Show', 'Completed') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
);

-- ─── ORDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    table_id INT,
    customer_id INT NULL,
    user_id INT NULL,
    order_number VARCHAR(20) DEFAULT NULL,
    party_size INT DEFAULT 1,
    session_id VARCHAR(50),
    order_type ENUM('Dine-In', 'Takeaway', 'Delivery') DEFAULT 'Dine-In',
    status ENUM('Pending', 'Ordered', 'Preparing', 'Ready', 'Served', 'Paid', 'Partially Paid', 'Cancelled', 'Rejected') DEFAULT 'Pending',
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    menu_item_id INT,
    name VARCHAR(255),
    description TEXT,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2),
    subtotal DECIMAL(10,2) NOT NULL,
    notes TEXT,
    extras JSON,
    variants JSON,
    kds_status ENUM('Pending', 'Cooking', 'Done') DEFAULT 'Pending',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- ─── PAYMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tip_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ─── STAFF SHIFTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_shifts (
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

-- ─── DELIVERY ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNIQUE NOT NULL,
    delivery_address TEXT NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    delivery_notes TEXT,
    courier_id INT,
    estimated_delivery_time DATETIME,
    actual_delivery_time DATETIME,
    status ENUM('Pending', 'Out for Delivery', 'Delivered', 'Failed') DEFAULT 'Pending',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (courier_id) REFERENCES users(id) ON DELETE SET NULL
);
-- ─── INITIAL DATA ───────────────────────────────────────────
INSERT IGNORE INTO branches (id, name, location, contact_number, status) VALUES (1, 'Zamzam Main', 'Main Street', '123456789', 'Active');
INSERT IGNORE INTO branch_settings (branch_id, kds_timer_minutes, allow_qr_pay, booking_fee_amount, is_booking_fee_enabled) VALUES (1, 15, 1, 10.00, 1);
INSERT IGNORE INTO tenant_settings (id, theme_mode, primary_accent_color, currency) VALUES (1, 'Dark', '#F25C05', 'USD');
