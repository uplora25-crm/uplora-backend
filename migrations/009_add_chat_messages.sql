-- Chat Messages Table
-- This table stores messages between team members
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL, -- Email of the user who sent the message
    receiver_email VARCHAR(255) NOT NULL, -- Email of the user who should receive the message
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_email ON chat_messages(sender_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_email ON chat_messages(receiver_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read);
-- Composite index for fetching conversation between two users
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(sender_email, receiver_email, created_at);

