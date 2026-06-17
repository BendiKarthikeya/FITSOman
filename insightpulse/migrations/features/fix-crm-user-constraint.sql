-- Fix CRM user constraint by making user_id nullable for testing
-- This allows CRM configs to be created without requiring a real user

-- Make user_id nullable
ALTER TABLE crm_configs ALTER COLUMN user_id DROP NOT NULL;

-- Create anonymous user if it doesn't exist
INSERT INTO users (id, email, name) 
VALUES ('anonymous', 'anonymous@example.com', 'Anonymous User')
ON CONFLICT (id) DO NOTHING;
