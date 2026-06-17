-- Add department NPS tracking table
CREATE TABLE IF NOT EXISTS department_nps (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Department reference
  department_id VARCHAR(255) REFERENCES departments(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- NPS metrics
  nps_score NUMERIC(5, 2), -- Net Promoter Score (-100 to 100)
  promoters INTEGER DEFAULT 0, -- Count of promoters (9-10)
  passives INTEGER DEFAULT 0, -- Count of passives (7-8)
  detractors INTEGER DEFAULT 0, -- Count of detractors (0-6)
  total_responses INTEGER DEFAULT 0, -- Total responses
  
  -- Period tracking
  period_month INTEGER, -- Month (1-12)
  period_year INTEGER, -- Year
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_department_nps_organization ON department_nps(organization_id);
CREATE INDEX IF NOT EXISTS idx_department_nps_department ON department_nps(department_id);
CREATE INDEX IF NOT EXISTS idx_department_nps_period ON department_nps(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_department_nps_org_period ON department_nps(organization_id, period_year, period_month);

-- Ensure each department has only one NPS record per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_department_nps_unique 
ON department_nps(department_id, period_year, period_month);
