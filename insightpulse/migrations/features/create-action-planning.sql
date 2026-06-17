-- Create action_planning table for standalone action plans
CREATE TABLE IF NOT EXISTS action_planning (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Assignment and tracking
  assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'todo', -- 'todo', 'in_progress', 'completed', 'review'
  priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Timeline
  due_date DATE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Organization context
  organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Metadata
  tags JSONB, -- Array of tags for filtering
  comments_count INTEGER DEFAULT 0,
  attachments_count INTEGER DEFAULT 0
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_action_planning_organization_id ON action_planning(organization_id);
CREATE INDEX IF NOT EXISTS idx_action_planning_assigned_to ON action_planning(assigned_to);
CREATE INDEX IF NOT EXISTS idx_action_planning_status ON action_planning(status);
CREATE INDEX IF NOT EXISTS idx_action_planning_created_by ON action_planning(created_by);
CREATE INDEX IF NOT EXISTS idx_action_planning_due_date ON action_planning(due_date);
