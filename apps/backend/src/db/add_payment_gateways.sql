USE zamzam_db;

CREATE TABLE IF NOT EXISTS payment_gateway_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gateway_name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'Stripe', 'PayPal'
    public_key VARCHAR(255),
    secret_key VARCHAR(255),
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    environment ENUM('sandbox', 'production') DEFAULT 'sandbox',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed initial data for Stripe and PayPal
INSERT IGNORE INTO payment_gateway_settings (gateway_name, is_active, environment) 
VALUES ('Stripe', FALSE, 'sandbox'), ('PayPal', FALSE, 'sandbox');
