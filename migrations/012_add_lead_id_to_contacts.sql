-- Migration: Add lead_id column to contacts table
-- This migration adds a lead_id column to track which lead a client was converted from
-- When a lead is converted to a client, the lead_id will be preserved in the client record

-- Add lead_id column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES leads(id);

-- Create an index on lead_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);

-- Backfill existing clients: Try to match clients to leads based on contact information
-- This will link existing clients to their original leads if we can find a match
UPDATE contacts c
SET lead_id = l.id
FROM leads l
WHERE c.is_client = true
  AND c.lead_id IS NULL
  AND l.contact_id = c.id;

-- Note: Some clients may not have a matching lead if they were created directly
-- Those will have lead_id = NULL, which is acceptable

