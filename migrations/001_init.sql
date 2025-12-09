-- Uplora CRM Database Initialization Migration
-- This file contains the initial database schema for the CRM system
-- It will be executed to set up tables for: cold calls, onsite visits, leads, pipeline, and team tasks

-- Note: This is a template migration file
-- Replace with your actual database schema when ready

-- Contacts Table
-- This table stores contact information for leads
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table
-- This table stores information about potential customers (leads)
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    contact_id INTEGER REFERENCES contacts(id),
    company_id INTEGER,
    source VARCHAR(100),
    stage VARCHAR(50) DEFAULT 'new',
    status VARCHAR(50) DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: Cold Calls Table
-- This table tracks cold call activities
CREATE TABLE IF NOT EXISTS cold_calls (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    call_date TIMESTAMP NOT NULL,
    duration INTEGER, -- in seconds
    outcome VARCHAR(100), -- e.g., 'answered', 'voicemail', 'no_answer'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: Onsite Visits Table
-- This table tracks scheduled and completed onsite visits
CREATE TABLE IF NOT EXISTS onsite_visits (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    visit_date TIMESTAMP NOT NULL,
    address TEXT,
    visit_type VARCHAR(100), -- e.g., 'initial', 'follow_up', 'demo'
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities Table
-- This table tracks general activities/interactions with leads (notes, emails, meetings, etc.)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    contact_id INTEGER REFERENCES contacts(id),
    activity_type VARCHAR(100) NOT NULL, -- 'call', 'email', 'meeting', 'note'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deals Table
-- This table tracks qualified opportunities (deals) linked to leads
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id INTEGER REFERENCES leads(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    deal_value DECIMAL(12, 2),
    stage VARCHAR(50) DEFAULT 'new', -- 'new', 'qualified', 'proposal', 'negotiation', 'closed'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: Pipeline Table (legacy - kept for compatibility)
-- This table tracks leads through different stages of the sales pipeline
CREATE TABLE IF NOT EXISTS pipeline (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    stage VARCHAR(100) NOT NULL, -- e.g., 'qualification', 'proposal', 'negotiation', 'closed'
    probability INTEGER DEFAULT 0, -- 0-100 percentage
    estimated_value DECIMAL(10, 2),
    expected_close_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Tasks Table
-- This table tracks tasks assigned to team members by email
CREATE TABLE IF NOT EXISTS team_tasks (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    assigned_to_email VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'done'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
-- This table stores user accounts for the CRM system, including admin users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'manager'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automation Runs Table
-- This table tracks automated workflow executions and scheduled tasks in the CRM system.
-- It stores information about when automations were triggered, their status (success/failure),
-- execution duration, and any error messages. This is useful for monitoring automation health,
-- debugging failed automations, and auditing automated actions like email sends, task creation,
-- lead status updates, or scheduled reports.
CREATE TABLE IF NOT EXISTS automation_runs (
    id SERIAL PRIMARY KEY,
    automation_name VARCHAR(255) NOT NULL, -- Name/identifier of the automation
    automation_type VARCHAR(100) NOT NULL, -- e.g., 'email_sequence', 'lead_scoring', 'task_reminder', 'report_generation'
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    triggered_by VARCHAR(100), -- 'scheduled', 'manual', 'event', 'webhook'
    related_lead_id INTEGER REFERENCES leads(id), -- Optional: link to related lead if applicable
    related_user_id INTEGER REFERENCES users(id), -- Optional: link to related user if applicable
    execution_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_completed_at TIMESTAMP,
    duration_ms INTEGER, -- Execution duration in milliseconds
    records_processed INTEGER DEFAULT 0, -- Number of records processed (e.g., leads updated, emails sent)
    error_message TEXT, -- Error details if status is 'failed'
    metadata JSONB, -- Additional automation-specific data (flexible JSON storage)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_cold_calls_lead_id ON cold_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_cold_calls_call_date ON cold_calls(call_date);
CREATE INDEX IF NOT EXISTS idx_onsite_visits_lead_id ON onsite_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_onsite_visits_visit_date ON onsite_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_pipeline_lead_id ON pipeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_team_tasks_assigned_to_email ON team_tasks(assigned_to_email);
CREATE INDEX IF NOT EXISTS idx_team_tasks_lead_id ON team_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_status ON team_tasks(status);
CREATE INDEX IF NOT EXISTS idx_team_tasks_due_date ON team_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_type ON automation_runs(automation_type);
CREATE INDEX IF NOT EXISTS idx_automation_runs_created_at ON automation_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_runs_lead_id ON automation_runs(related_lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_user_id ON automation_runs(related_user_id);

-- Seed Data: Insert test data for development/testing
-- Insert 1 admin user
-- Note: In production, use proper password hashing (bcrypt, argon2, etc.)
-- This is a placeholder hash for testing purposes
INSERT INTO users (email, password_hash, name, role, is_active)
SELECT 
    'admin@uplora-crm.com',
    '$2a$10$placeholder_hash_replace_in_production', -- Replace with actual bcrypt hash
    'Admin User',
    'admin',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@uplora-crm.com'
);

-- Insert 2 test leads
INSERT INTO leads (name, email, phone, company, status, source, notes)
SELECT 'John Doe', 'john.doe@example.com', '+1-555-0101', 'Acme Corporation', 'new', 'website', 'Interested in digital marketing services. Initial contact made via contact form.'
WHERE NOT EXISTS (SELECT 1 FROM leads WHERE email = 'john.doe@example.com')
UNION ALL
SELECT 'Jane Smith', 'jane.smith@techstartup.io', '+1-555-0102', 'TechStartup Inc', 'qualified', 'referral', 'Referred by existing client. High priority lead with budget confirmed.'
WHERE NOT EXISTS (SELECT 1 FROM leads WHERE email = 'jane.smith@techstartup.io');

