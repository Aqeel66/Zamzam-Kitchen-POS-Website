ALTER TABLE orders ADD COLUMN origin ENUM('Website', 'In-Store', 'QR-Menu') DEFAULT 'In-Store';
ALTER TABLE reservations ADD COLUMN origin ENUM('Website', 'In-Store', 'Phone') DEFAULT 'In-Store';
