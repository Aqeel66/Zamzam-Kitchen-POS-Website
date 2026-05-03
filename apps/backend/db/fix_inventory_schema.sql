-- Fix inventory_items table schema
ALTER TABLE inventory_items 
ADD COLUMN min_stock_level DECIMAL(10,2) DEFAULT 0,
ADD COLUMN cost_per_unit DECIMAL(10,2) DEFAULT 0.00;
