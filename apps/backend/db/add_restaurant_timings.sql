ALTER TABLE branch_settings
ADD COLUMN opening_time TIME DEFAULT '09:00:00',
ADD COLUMN closing_time TIME DEFAULT '23:00:00',
ADD COLUMN first_order_time TIME DEFAULT '09:00:00',
ADD COLUMN last_order_time TIME DEFAULT '22:30:00';
