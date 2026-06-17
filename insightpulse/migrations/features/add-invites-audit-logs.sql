-- UM-017, UM-019: invites and audit logs
CREATE TABLE IF NOT EXISTS user_invites (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token varchar NOT NULL UNIQUE,
  organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  department_id varchar REFERENCES departments(id) ON DELETE SET NULL,
  role varchar(50) DEFAULT 'user',
  invited_by varchar REFERENCES users(id),
  expires_at timestamp,
  accepted_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id varchar REFERENCES users(id),
  action varchar(100) NOT NULL,
  target_type varchar(50) NOT NULL,
  target_id varchar,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);
