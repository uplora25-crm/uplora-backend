-- Migration: Add in_time, out_time, and rescheduled_date columns to onsite_visits table
-- This migration adds time tracking and rescheduling information to onsite visits

-- Add in_time column (time when visit started)
ALTER TABLE onsite_visits 
ADD COLUMN IF NOT EXISTS in_time TIME;

-- Add out_time column (time when visit ended)
ALTER TABLE onsite_visits 
ADD COLUMN IF NOT EXISTS out_time TIME;

-- Add rescheduled_date column (when visit was rescheduled to, or 'dont_know' string)
ALTER TABLE onsite_visits 
ADD COLUMN IF NOT EXISTS rescheduled_date TEXT;

