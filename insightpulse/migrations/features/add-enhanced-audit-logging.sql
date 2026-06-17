-- Enhanced Audit & Session Tracking Migration
-- Adds comprehensive audit logging and session tracking for RBAC and user activities

-- Add missing columns to activity_logs if they don't exist
ALTER TABLE IF EXISTS activity_logs
  ADD COLUMN IF NOT EXISTS organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id varchar REFERENCES departments(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);

CREATE INDEX IF NOT EXISTS idx_authentication_events_user_id ON authentication_events(user_id);
CREATE INDEX IF NOT EXISTS idx_authentication_events_event_type ON authentication_events(event_type);
CREATE INDEX IF NOT EXISTS idx_authentication_events_created_at ON authentication_events(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create role assignment audit tracking table if doesn't exist
CREATE TABLE IF NOT EXISTS role_assignment_audit (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id varchar NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by varchar REFERENCES users(id) ON DELETE SET NULL,
  action varchar(20) NOT NULL CHECK (action IN ('assigned', 'removed')),
  reason text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_assignment_audit_user_id ON role_assignment_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_audit_assigned_by ON role_assignment_audit(assigned_by);
CREATE INDEX IF NOT EXISTS idx_role_assignment_audit_created_at ON role_assignment_audit(created_at);

-- Create CRM sync audit table if doesn't exist
CREATE TABLE IF NOT EXISTS crm_sync_audit (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_config_id varchar NOT NULL REFERENCES crm_configs(id) ON DELETE CASCADE,
  triggered_by varchar REFERENCES users(id) ON DELETE SET NULL,
  sync_type varchar(50) NOT NULL, -- 'contacts', 'companies', 'deals', etc.
  status varchar(20) NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  records_synced integer DEFAULT 0,
  error_message text,
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_audit_config_id ON crm_sync_audit(crm_config_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_audit_triggered_by ON crm_sync_audit(triggered_by);
CREATE INDEX IF NOT EXISTS idx_crm_sync_audit_status ON crm_sync_audit(status);
CREATE INDEX IF NOT EXISTS idx_crm_sync_audit_started_at ON crm_sync_audit(started_at);

-- Create survey activity audit table if doesn't exist
CREATE TABLE IF NOT EXISTS survey_activity_audit (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id varchar NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  action varchar(50) NOT NULL, -- 'created', 'updated', 'deleted', 'published', 'archived'
  change_details jsonb,
  ip_address varchar(45),
  user_agent text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_activity_audit_survey_id ON survey_activity_audit(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_activity_audit_user_id ON survey_activity_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_activity_audit_action ON survey_activity_audit(action);
CREATE INDEX IF NOT EXISTS idx_survey_activity_audit_created_at ON survey_activity_audit(created_at);

-- Create user management audit table if doesn't exist
CREATE TABLE IF NOT EXISTS user_management_audit (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action varchar(50) NOT NULL, -- 'created', 'updated', 'deleted', 'role_assigned', 'role_removed', 'org_assigned'
  changes jsonb,
  reason text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_mgmt_audit_target_user_id ON user_management_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_mgmt_audit_admin_id ON user_management_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_mgmt_audit_action ON user_management_audit(action);
CREATE INDEX IF NOT EXISTS idx_user_mgmt_audit_created_at ON user_management_audit(created_at);

-- Create bulk operation audit table if doesn't exist
CREATE TABLE IF NOT EXISTS bulk_operation_audit (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type varchar(50) NOT NULL, -- 'import', 'export', 'bulk_delete', 'bulk_update', etc.
  initiated_by varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type varchar(50) NOT NULL, -- 'users', 'surveys', 'responses', etc.
  total_records integer NOT NULL,
  processed_records integer DEFAULT 0,
  failed_records integer DEFAULT 0,
  status varchar(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_summary text,
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  file_path text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_bulk_op_audit_initiated_by ON bulk_operation_audit(initiated_by);
CREATE INDEX IF NOT EXISTS idx_bulk_op_audit_operation_type ON bulk_operation_audit(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_op_audit_status ON bulk_operation_audit(status);
CREATE INDEX IF NOT EXISTS idx_bulk_op_audit_created_at ON bulk_operation_audit(started_at);
