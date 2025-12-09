-- Client Project Files Table
-- This table stores metadata for files uploaded for client projects
CREATE TABLE IF NOT EXISTS client_project_files (
    id SERIAL PRIMARY KEY,
    client_id TEXT NOT NULL, -- Matches project_credentials.client_id type
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path to the stored file
    file_size BIGINT NOT NULL, -- File size in bytes
    mime_type VARCHAR(100), -- MIME type of the file
    uploaded_by VARCHAR(255), -- Email of user who uploaded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_project_files_client_id ON client_project_files(client_id);
CREATE INDEX IF NOT EXISTS idx_client_project_files_created_at ON client_project_files(created_at);

