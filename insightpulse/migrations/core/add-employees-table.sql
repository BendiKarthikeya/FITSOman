-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone_number varchar(20) NOT NULL,
  role text NOT NULL,
  department_id varchar REFERENCES departments(id),
  organization_id varchar REFERENCES organizations(id),
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Create index on phone number for lookups
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone_number);

-- Create index on department_id for filtering
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);

-- Create index on organization_id for filtering
CREATE INDEX IF NOT EXISTS idx_employees_organization ON employees(organization_id);
