-- Migration: Add tax settings columns to branch_settings
-- Run: 2026-04-29
ALTER TABLE branch_settings
  ADD COLUMN is_tax_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 0.00;
