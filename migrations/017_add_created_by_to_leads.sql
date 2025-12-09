-- Migration: Add created_by_email field to leads table
-- This tracks which user created each lead

ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_created_by_email ON leads(created_by_email);

