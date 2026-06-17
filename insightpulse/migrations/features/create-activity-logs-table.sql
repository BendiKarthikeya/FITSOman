-- Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  organization_id VARCHAR REFERENCES organizations(id) ON DELETE SET NULL,
  department_id VARCHAR REFERENCES departments(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR,
  resource_name VARCHAR,
  details JSONB,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);

-- Create authentication_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS authentication_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100),
  event_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  failure_reason VARCHAR(100),
  auth_method VARCHAR(50) DEFAULT 'password',
  session_id VARCHAR,
  ip_address VARCHAR(50) NOT NULL,
  user_agent TEXT,
  location VARCHAR(200),
  device_info JSONB,
  mfa_used BOOLEAN DEFAULT false,
  risk_level VARCHAR(20) DEFAULT 'low',
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for authentication_events
CREATE INDEX IF NOT EXISTS idx_authentication_events_user_id ON authentication_events(user_id);
CREATE INDEX IF NOT EXISTS idx_authentication_events_event_type ON authentication_events(event_type);
CREATE INDEX IF NOT EXISTS idx_authentication_events_created_at ON authentication_events(created_at);
