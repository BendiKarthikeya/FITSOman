-- Add shared_with column to surveys table
-- Supported values: 'employee', 'customer'
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS shared_with VARCHAR(20) NOT NULL DEFAULT 'employee';
