-- Fix action_planning foreign key from users to employees
-- and add comments and attachments tables

-- Drop the old foreign key constraint
ALTER TABLE action_planning 
DROP CONSTRAINT IF EXISTS action_planning_assigned_to_fkey;

-- Add the new foreign key constraint to employees
ALTER TABLE action_planning 
ADD CONSTRAINT action_planning_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL;

-- Create action_plan_comments table
CREATE TABLE IF NOT EXISTS action_plan_comments (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id VARCHAR(255) NOT NULL REFERENCES action_planning(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create action_plan_attachments table
CREATE TABLE IF NOT EXISTS action_plan_attachments (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id VARCHAR(255) NOT NULL REFERENCES action_planning(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  display_name VARCHAR(255),
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_action_plan_comments_action_plan_id ON action_plan_comments(action_plan_id);
CREATE INDEX IF NOT EXISTS idx_action_plan_comments_user_id ON action_plan_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_action_plan_attachments_action_plan_id ON action_plan_attachments(action_plan_id);
