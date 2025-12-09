-- Notifications Table
-- This table stores notifications for users, such as task assignments
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL, -- Email of the user who should receive the notification
    type VARCHAR(50) NOT NULL, -- 'task_assigned', 'task_updated', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_task_id INTEGER REFERENCES team_tasks(id) ON DELETE CASCADE,
    related_lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related_task_id ON notifications(related_task_id);

