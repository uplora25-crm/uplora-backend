-- Migration: Add verticals column to leads table
-- This migration adds a verticals field to track the industry/vertical of each lead

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS verticals VARCHAR(255);

