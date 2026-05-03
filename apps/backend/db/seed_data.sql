-- ============================================================
-- Zamzam Kitchen — Seed Data
-- ============================================================

USE zamzam_db;

-- ─── 1. ROLES & ADMIN USER ──────────────────────────────────
INSERT IGNORE INTO roles (id, name, description) VALUES 
(1, 'Admin', 'Full administrative access'),
(2, 'Manager', 'Branch manager access'),
(3, 'Cashier', 'POS operator'),
(4, 'Chef', 'Kitchen staff for KDS'),
(5, 'Waiter', 'Floor staff');

-- ─── 1.1 PERMISSIONS ─────────────────────────────────────────
INSERT IGNORE INTO permissions (id, name) VALUES 
(1, 'view_dashboard'),
(2, 'manage_menu'),
(3, 'manage_orders'),
(4, 'void_orders'),
(5, 'manage_reservations'),
(6, 'manage_tables'),
(7, 'view_reports'),
(8, 'manage_users'),
(9, 'manage_roles'),
(10, 'view_kds'),
(11, 'access_pos'),
(12, 'manage_inventory'),
(13, 'manage_purchase'),
(14, 'manage_hr'),
(15, 'manage_customers'),
(16, 'manage_settings_general'),
(17, 'manage_settings_operations'),
(18, 'manage_settings_branding'),
(19, 'manage_settings_payments'),
(20, 'manage_settings_communications'),
(21, 'manage_settings_reset'),
(22, 'manage_promotions'),
(23, 'manage_recipes'),
(24, 'view_analytics');

-- ─── 1.2 ROLE PERMISSIONS ───────────────────────────────────
-- Admin: All
INSERT IGNORE INTO role_permissions (role_id, permission_id) 
SELECT 1, id FROM permissions;

-- Manager: Most
INSERT IGNORE INTO role_permissions (role_id, permission_id) 
SELECT 2, id FROM permissions WHERE id NOT IN (9);

-- Cashier: POS & Orders
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES 
(3, 11), (3, 3), (3, 5);

-- Chef: KDS
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES 
(4, 10);

-- Waiter: POS & Tables
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES 
(5, 11), (5, 6);

-- Password 'password123' (assuming plain hash for now or bypassing auth if backend uses token)
-- In a real app we'd hash this. Given the current setup, we'll insert a mock hash.
INSERT IGNORE INTO users (id, username, password_hash, first_name, last_name, email, phone) VALUES 
(1, 'admin', 'mock_hash', 'Super', 'Admin', 'admin@zamzam.com', '1234567890'),
(2, 'cashier1', 'mock_hash', 'Ali', 'Khan', 'ali@zamzam.com', '1234567891'),
(3, 'chef1', 'mock_hash', 'Omar', 'Chef', 'omar@zamzam.com', '1234567892');

INSERT IGNORE INTO user_roles (user_id, role_id) VALUES 
(1, 1), (2, 3), (3, 4);

-- ─── 2. BRANCHES & APP SETTINGS ─────────────────────────────
INSERT IGNORE INTO branches (id, name, location, contact_number, status) VALUES 
(1, 'Zamzam Main', 'Downtown Metro', '+1-800-ZAMZAM', 'Active');

INSERT IGNORE INTO branch_settings (branch_id, kds_timer_minutes, allow_qr_pay, flexible_bill_splitting, gratuity_percentage) VALUES 
(1, 15, TRUE, TRUE, 10.00);

-- ─── 3. TABLES (FLOOR PLAN) ─────────────────────────────────
INSERT IGNORE INTO restaurant_tables (id, branch_id, table_number, capacity, status, pos_x, pos_y) VALUES 
(1, 1, 'T1', 4, 'Available', 10, 10),
(2, 1, 'T2', 2, 'Available', 50, 10),
(3, 1, 'T3', 6, 'Available', 10, 50),
(4, 1, 'T4', 8, 'Available', 50, 50);

-- ─── 4. MENU CATEGORIES & ITEMS ─────────────────────────────
INSERT IGNORE INTO categories (id, name, description) VALUES 
(1, 'Starters', 'Appetizers to start the meal'),
(2, 'Mains', 'Hearty main courses'),
(3, 'Grill', 'Tandoori and BBQ items'),
(4, 'Beverages', 'Refreshing drinks and teas');

INSERT IGNORE INTO menu_items (id, category_id, name, description, price, is_available, prep_station) VALUES 
(1, 1, 'Vegetable Samosa', 'Crispy pastries filled with spiced vegetables', 4.50, TRUE, 'Fryer'),
(2, 1, 'Chicken Tikka', 'Marinated chicken pieces cooked in clay oven', 8.00, TRUE, 'Grill'),
(3, 2, 'Chicken Biryani', 'Aromatic basmati rice with tender chicken', 15.00, TRUE, 'General'),
(4, 2, 'Lamb Karahi', 'Traditional wok-cooked lamb in tomato gravy', 18.50, TRUE, 'General'),
(5, 3, 'Seekh Kebab', 'Spiced minced meat skewers', 12.00, TRUE, 'Grill'),
(6, 3, 'Tandoori Mixed Grill', 'Assortment of roasted meats', 24.00, TRUE, 'Grill'),
(7, 4, 'Mango Lassi', 'Sweet mango yogurt drink', 5.50, TRUE, 'Bar'),
(8, 4, 'Masala Chai', 'Spiced aromatic tea', 3.50, TRUE, 'Bar');

-- ─── 5. TENANT SETTINGS ─────────────────────────────────────
INSERT IGNORE INTO tenant_settings (id, theme_mode, primary_accent_color, typography_primary, typography_secondary, currency) VALUES 
(1, 'System', '#F15A24', 'Manrope', 'Inter', 'USD');
