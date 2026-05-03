-- Update permissions to include granular settings and other missing modules
USE zamzam_db;

-- 1. Insert new permissions if they don't exist
INSERT IGNORE INTO permissions (id, name) VALUES 
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

-- 2. Ensure Admin role (id: 1) has all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id) 
SELECT 1, id FROM permissions;

-- 3. Optional: Assign basic management permissions to Manager role (id: 2)
-- Managers get everything except manage_roles, manage_users, and system_reset
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions 
WHERE name NOT IN ('manage_roles', 'manage_users', 'manage_settings_reset');
