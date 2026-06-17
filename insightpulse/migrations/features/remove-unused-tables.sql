-- Migration: Remove unused tables
-- Created: 2026-02-16
-- Description: Removes 5 unused tables that were defined but never actively used:
--   1. mfa_settings - MFA feature was never implemented
--   2. role_assignment_audit - Write-only audit table never queried
--   3. crm_sync_audit - Write-only audit table never queried
--   4. user_management_audit - Never referenced or used
--   5. bulk_operation_audit - Never referenced or used

-- Drop unused tables
DROP TABLE IF EXISTS mfa_settings CASCADE;
DROP TABLE IF EXISTS role_assignment_audit CASCADE;
DROP TABLE IF EXISTS crm_sync_audit CASCADE;
DROP TABLE IF EXISTS user_management_audit CASCADE;
DROP TABLE IF EXISTS bulk_operation_audit CASCADE;
