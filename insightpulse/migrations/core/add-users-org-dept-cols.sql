-- Add optional org/department columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id varchar REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id varchar REFERENCES departments(id);
