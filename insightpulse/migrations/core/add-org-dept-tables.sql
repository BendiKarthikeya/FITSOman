-- UM-011 to UM-020: base org/department tables
CREATE TABLE IF NOT EXISTS organizations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  plan varchar(50) DEFAULT 'professional',
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id varchar REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
