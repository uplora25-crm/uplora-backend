-- Migration: Add company column to contacts table
-- This migration adds a company name field to the contacts table

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS company VARCHAR(255);

