-- Add deleted_at column to contacts table for soft delete functionality
-- This allows clients to be moved to trash instead of being permanently deleted

ALTER TABLE contacts
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create an index on deleted_at for faster queries
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at);

-- Add a comment explaining the column
COMMENT ON COLUMN contacts.deleted_at IS 'Timestamp when the contact was soft deleted. NULL means not deleted.';

