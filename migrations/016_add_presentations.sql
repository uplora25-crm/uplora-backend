-- Migration: Add presentations table
-- This migration creates a table to store presentation files organized by category

CREATE TABLE IF NOT EXISTS presentations (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  custom_label VARCHAR(255),
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster category queries
CREATE INDEX IF NOT EXISTS idx_presentations_category ON presentations(category);

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_presentations_created_at ON presentations(created_at DESC);

