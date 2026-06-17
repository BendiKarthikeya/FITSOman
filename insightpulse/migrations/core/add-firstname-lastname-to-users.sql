-- Add firstName and lastName columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text;

-- Create index on first_name for faster queries
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
