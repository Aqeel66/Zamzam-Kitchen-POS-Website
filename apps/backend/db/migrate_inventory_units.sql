-- Migration: Add Pack Unit and Pack Size to Inventory
ALTER TABLE inventory_items 
ADD COLUMN pack_unit VARCHAR(50) DEFAULT NULL,
ADD COLUMN pack_size DECIMAL(10,2) DEFAULT 1.00;
