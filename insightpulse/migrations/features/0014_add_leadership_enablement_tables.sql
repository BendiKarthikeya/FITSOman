-- Add new columns to leadership_insights table
ALTER TABLE leadership_insights 
ADD COLUMN IF NOT EXISTS recognition_opportunities jsonb,
ADD COLUMN IF NOT EXISTS performance_habits jsonb,
ADD COLUMN IF NOT EXISTS culture_indicators jsonb,
ADD COLUMN IF NOT EXISTS department_id varchar REFERENCES departments(id);

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id varchar REFERENCES surveys(id) ON DELETE CASCADE,
  insight_id varchar REFERENCES leadership_insights(id) ON DELETE CASCADE,
  
  -- Action details
  title text NOT NULL,
  description text,
  category varchar(50) NOT NULL,
  priority varchar(20) NOT NULL,
  
  -- Assignment and tracking
  assigned_to varchar REFERENCES users(id),
  department_id varchar REFERENCES departments(id),
  status varchar(20) DEFAULT 'pending',
  
  -- Timeline
  due_date timestamp,
  completed_at timestamp,
  
  -- Evidence and impact
  evidence_count integer,
  expected_impact text,
  actual_impact text,
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create recognition_templates table
CREATE TABLE IF NOT EXISTS recognition_templates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template details
  name text NOT NULL,
  category varchar(50) NOT NULL,
  template text NOT NULL,
  
  -- Usage and effectiveness
  usage_count integer DEFAULT 0,
  average_rating numeric(3, 2),
  
  is_public boolean DEFAULT true,
  created_by varchar REFERENCES users(id),
  
  created_at timestamp DEFAULT now()
);

-- Create interventions table
CREATE TABLE IF NOT EXISTS interventions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Intervention details
  title text NOT NULL,
  description text,
  type varchar(50) NOT NULL,
  
  -- Scope
  scope varchar(20) NOT NULL,
  target_departments jsonb,
  
  -- Priority and impact
  priority varchar(20) NOT NULL,
  urgency varchar(20) NOT NULL,
  expected_impact varchar(20),
  
  -- Evidence
  based_on_surveys jsonb,
  evidence_count integer,
  affected_employees integer,
  
  -- Ownership and status
  owned_by varchar REFERENCES users(id),
  status varchar(20) DEFAULT 'planned',
  
  -- Timeline and budget
  start_date timestamp,
  completed_at timestamp,
  estimated_cost numeric(15, 2),
  actual_cost numeric(15, 2),
  
  -- ROI tracking
  baseline_metrics jsonb,
  follow_up_metrics jsonb,
  roi numeric(10, 2),
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_action_items_survey ON action_items(survey_id);
CREATE INDEX IF NOT EXISTS idx_action_items_insight ON action_items(insight_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned ON action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_action_items_department ON action_items(department_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);

CREATE INDEX IF NOT EXISTS idx_recognition_templates_category ON recognition_templates(category);

CREATE INDEX IF NOT EXISTS idx_interventions_owned_by ON interventions(owned_by);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_priority ON interventions(priority);

CREATE INDEX IF NOT EXISTS idx_leadership_insights_department ON leadership_insights(department_id);
