-- Project Credentials Table
-- This table stores encrypted credentials for client projects
-- Note: client_id stores the contact/client ID (type depends on contacts.id - could be INTEGER or UUID)
-- Foreign key constraint removed temporarily to avoid type mismatch issues
CREATE TABLE IF NOT EXISTS project_credentials (
    id SERIAL PRIMARY KEY,
    client_id TEXT NOT NULL, -- Using TEXT to support both INTEGER and UUID
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500),
    username VARCHAR(255),
    encrypted_password TEXT NOT NULL, -- Encrypted password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_credentials_client_id ON project_credentials(client_id);
CREATE INDEX IF NOT EXISTS idx_project_credentials_created_at ON project_credentials(created_at);

