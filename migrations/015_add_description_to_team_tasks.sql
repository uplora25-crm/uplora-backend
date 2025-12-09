-- Migration: Add description column to team_tasks table
-- This migration adds a description column to store task descriptions

-- Add description column to team_tasks table
ALTER TABLE team_tasks 
ADD COLUMN IF NOT EXISTS description TEXT;

