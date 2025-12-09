-- Migration: Add client_id column to team_tasks table
-- This migration adds a client_id column to track tasks assigned to clients
-- Tasks can be assigned to either a lead (lead_id) or a client (client_id)
-- Note: contacts.id is UUID, so client_id must also be UUID

-- Add client_id column to team_tasks table (UUID to match contacts.id)
ALTER TABLE team_tasks
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES contacts(id);

-- Create an index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_tasks_client_id ON team_tasks(client_id);

-- Add a check constraint to ensure a task is assigned to either a lead OR a client (not both, not neither)
-- Note: This is a soft constraint - we'll handle validation in application code
-- ALTER TABLE team_tasks
-- ADD CONSTRAINT check_lead_or_client CHECK (
--   (lead_id IS NOT NULL AND client_id IS NULL) OR 
--   (lead_id IS NULL AND client_id IS NOT NULL)
-- );

