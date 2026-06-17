-- TEEJARTI Production Database Cleanup Script
-- WARNING: This will remove ALL demo/test data. Use only before production launch.

BEGIN;

-- Remove demo listings and related data
DELETE FROM listings WHERE id IN (
  SELECT id FROM listings 
  WHERE title_en LIKE '%Test%' 
  OR title_en LIKE '%Demo%' 
  OR title_en LIKE '%Sample%'
  OR description_en LIKE '%demo%'
  OR description_en LIKE '%test%'
);

-- Remove demo users (keep only admin accounts)
DELETE FROM kyc_docs WHERE user_id IN (
  SELECT id FROM users 
  WHERE role != 'admin' 
  AND (username LIKE '%test%' OR email LIKE '%test%' OR email LIKE '%demo%')
);

DELETE FROM kyc WHERE user_id IN (
  SELECT id FROM users 
  WHERE role != 'admin' 
  AND (username LIKE '%test%' OR email LIKE '%test%' OR email LIKE '%demo%')
);

DELETE FROM user_sessions WHERE user_id IN (
  SELECT id FROM users 
  WHERE role != 'admin' 
  AND (username LIKE '%test%' OR email LIKE '%test%' OR email LIKE '%demo%')
);

DELETE FROM users WHERE role != 'admin' 
  AND (username LIKE '%test%' OR email LIKE '%test%' OR email LIKE '%demo%');

-- Reset auto-increment sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE listings_id_seq RESTART WITH 1;
ALTER SEQUENCE kyc_id_seq RESTART WITH 1;
ALTER SEQUENCE kyc_docs_id_seq RESTART WITH 1;

-- Clean up uploaded files (run this manually on server)
-- rm -rf /public/uploads/test_*
-- rm -rf /public/uploads/demo_*
-- rm -rf /public/uploads/kyc_*_[0-9]*_* (keep only admin uploads)

COMMIT;

-- Verify cleanup
SELECT 'Users remaining:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Listings remaining:', COUNT(*) FROM listings
UNION ALL
SELECT 'KYC applications remaining:', COUNT(*) FROM kyc
UNION ALL
SELECT 'KYC documents remaining:', COUNT(*) FROM kyc_docs;