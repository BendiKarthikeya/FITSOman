-- SSO Providers table (UM-035 to UM-038)
CREATE TABLE IF NOT EXISTS sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('oauth2', 'saml', 'ldap')),
  client_id VARCHAR(255) NOT NULL,
  client_secret VARCHAR(255),
  endpoint VARCHAR(255),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, name)
);

-- Permission Groups table (UM-039 to UM-043)
CREATE TABLE IF NOT EXISTS permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, name)
);

-- Role Hierarchy table (UM-039 to UM-043)
CREATE TABLE IF NOT EXISTS role_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_role_id UUID REFERENCES role_hierarchy(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1,
  permissions JSONB DEFAULT '[]'::jsonb,
  delegated_roles JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, name)
);

-- Onboarding Progress table (UM-051 to UM-053)
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  step_id VARCHAR(50) NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  is_skipped BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  skipped_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, step_id)
);

-- Data Transfer Jobs table (UM-048 to UM-050)
CREATE TABLE IF NOT EXISTS data_transfer_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('import', 'export')),
  filename VARCHAR(255) NOT NULL,
  format VARCHAR(50) NOT NULL DEFAULT 'csv',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_message TEXT,
  file_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MFA Settings table
CREATE TABLE IF NOT EXISTS mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN DEFAULT false,
  strict_password_policy BOOLEAN DEFAULT false,
  password_min_length INTEGER DEFAULT 8,
  password_require_numbers BOOLEAN DEFAULT true,
  password_require_symbols BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session table (already exists but ensure it's set up)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device VARCHAR(100),
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sso_providers_org ON sso_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_permission_groups_org ON permission_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_hierarchy_org ON role_hierarchy(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_org ON onboarding_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_transfer_jobs_org ON data_transfer_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_transfer_jobs_status ON data_transfer_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mfa_settings_org ON mfa_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_org ON sessions(organization_id);
