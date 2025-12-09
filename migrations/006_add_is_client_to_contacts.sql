-- Add is_client flag to contacts table
-- This flag marks contacts that have been converted from closed deals to clients
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_is_client ON contacts(is_client);

