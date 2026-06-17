-- CRM Integration Tables Migration
-- Creates tables for storing CRM configuration and connections

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS crm_sync_logs CASCADE;
DROP TABLE IF EXISTS crm_configs CASCADE;

-- Create CRM Configs table
CREATE TABLE crm_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL CHECK (crm_type IN ('zoho', 'salesforce', 'hubspot')),
  auth_type VARCHAR(50) NOT NULL,
  credentials JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  last_tested_status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create CRM Sync Logs table
CREATE TABLE crm_sync_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id VARCHAR REFERENCES crm_configs(id) ON DELETE CASCADE,
  operation VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_successful INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_configs_active ON crm_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_configs_type ON crm_configs(crm_type);
CREATE INDEX IF NOT EXISTS idx_crm_configs_user ON crm_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_config ON crm_sync_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_status ON crm_sync_logs(status);

COMMENT ON TABLE crm_configs IS 'Stores CRM integration configurations for Zoho, Salesforce, and HubSpot';
COMMENT ON COLUMN crm_configs.crm_type IS 'Type of CRM: zoho, salesforce, or hubspot';
COMMENT ON COLUMN crm_configs.auth_type IS 'Authentication method: OAuth2, JWT, Self Client, etc.';
COMMENT ON COLUMN crm_configs.credentials IS 'Encrypted credentials stored as JSON';
COMMENT ON COLUMN crm_configs.is_active IS 'Whether this CRM connection is currently active';
