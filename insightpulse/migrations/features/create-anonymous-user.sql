-- Insert anonymous user for CRM testing
-- Run this directly in your Neon database SQL Editor

INSERT INTO users (id, username, password, email, role, created_at)
VALUES (
  'anonymous',
  'anonymous',
  'no-password-needed',
  'anonymous@example.com',
  'user',
  now()
)
ON CONFLICT (id) DO NOTHING;
