USE zamzam_db;

-- Add booking_fee and payment_status to reservations table
ALTER TABLE reservations 
ADD COLUMN booking_fee DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN payment_status ENUM('Pending', 'Paid', 'Refunded') DEFAULT 'Pending';

-- Optional: Update existing records if needed
UPDATE reservations SET booking_fee = 0.00, payment_status = 'Pending' WHERE booking_fee IS NULL;
