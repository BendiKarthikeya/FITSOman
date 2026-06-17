-- Add survey_type column to surveys table
-- Supported values: 'web', 'mobile', 'voice', 'email'
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS survey_type VARCHAR(20) NOT NULL DEFAULT 'web';
