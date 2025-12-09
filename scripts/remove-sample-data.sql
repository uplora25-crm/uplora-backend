-- =====================================================
-- Remove Sample Data from Uplora CRM Database
-- =====================================================
-- This script removes sample/test data from the database
-- WARNING: This will permanently delete data. Use with caution!
-- 
-- Before running:
-- 1. Backup your database
-- 2. Review the queries below
-- 3. Test on a development database first
-- =====================================================

-- =====================================================
-- STEP 1: Identify Sample Data
-- =====================================================
-- First, let's see what sample data exists

-- Check for sample company names (from migration 003)
SELECT 
    'Sample Companies' as category,
    COUNT(*) as count
FROM contacts
WHERE company IN (
    'Acme Corporation',
    'TechStart Solutions',
    'Global Dynamics Inc.',
    'Innovation Labs',
    'Digital Ventures',
    'Cloud Systems Ltd.',
    'Enterprise Solutions',
    'Future Technologies',
    'Smart Business Group',
    'Advanced Systems Co.',
    'Prime Industries',
    'Elite Services Inc.',
    'Strategic Partners LLC',
    'NextGen Technologies',
    'Modern Solutions Group',
    'ProActive Industries',
    'Visionary Enterprises',
    'Excellence Corp.',
    'Summit Business Solutions',
    'Pinnacle Technologies'
);

-- Check for sample verticals (from migration 005)
SELECT 
    'Sample Verticals' as category,
    COUNT(*) as count
FROM leads
WHERE verticals IS NOT NULL 
AND verticals != '';

-- =====================================================
-- STEP 2: Remove Sample Data (OPTION A - Delete Everything)
-- =====================================================
-- Uncomment the section below if you want to delete ALL data
-- WARNING: This deletes everything!

/*
-- Delete in order to respect foreign key constraints

-- Delete task attachments first (if any)
DELETE FROM task_attachments;

-- Delete activities
DELETE FROM activities;

-- Delete notifications
DELETE FROM notifications;

-- Delete chat messages
DELETE FROM chat_messages;

-- Delete cold calls
DELETE FROM cold_calls;

-- Delete onsite visits
DELETE FROM onsite_visits;

-- Delete deals
DELETE FROM deals;

-- Delete pipeline entries
DELETE FROM pipeline;

-- Delete team tasks
DELETE FROM team_tasks;

-- Delete client project files
DELETE FROM client_project_files;

-- Delete project credentials
DELETE FROM project_credentials;

-- Delete leads
DELETE FROM leads;

-- Delete contacts
DELETE FROM contacts;

-- Delete automation runs
DELETE FROM automation_runs;

-- Reset sequences (optional, if you want IDs to start from 1)
ALTER SEQUENCE contacts_id_seq RESTART WITH 1;
ALTER SEQUENCE leads_id_seq RESTART WITH 1;
ALTER SEQUENCE cold_calls_id_seq RESTART WITH 1;
ALTER SEQUENCE onsite_visits_id_seq RESTART WITH 1;
ALTER SEQUENCE activities_id_seq RESTART WITH 1;
ALTER SEQUENCE team_tasks_id_seq RESTART WITH 1;
*/

-- =====================================================
-- STEP 3: Remove Sample Data (OPTION B - Selective Removal)
-- =====================================================
-- Remove only data with sample company names

BEGIN;

-- First, clear lead_id references in contacts (to avoid foreign key constraint)
-- contacts.lead_id references leads.id, so we must clear these references before deleting leads
UPDATE contacts
SET lead_id = NULL, updated_at = NOW()
WHERE lead_id IN (
    SELECT id FROM leads
    WHERE contact_id IN (
        SELECT id FROM contacts
        WHERE company IN (
            'Acme Corporation',
            'TechStart Solutions',
            'Global Dynamics Inc.',
            'Innovation Labs',
            'Digital Ventures',
            'Cloud Systems Ltd.',
            'Enterprise Solutions',
            'Future Technologies',
            'Smart Business Group',
            'Advanced Systems Co.',
            'Prime Industries',
            'Elite Services Inc.',
            'Strategic Partners LLC',
            'NextGen Technologies',
            'Modern Solutions Group',
            'ProActive Industries',
            'Visionary Enterprises',
            'Excellence Corp.',
            'Summit Business Solutions',
            'Pinnacle Technologies'
        )
    )
);

-- First, clear lead_id references in contacts that point to leads we're about to delete
-- This is necessary because contacts.lead_id has a foreign key constraint to leads.id
UPDATE contacts
SET lead_id = NULL, updated_at = NOW()
WHERE lead_id IN (
    SELECT id FROM leads
    WHERE contact_id IN (
        SELECT id FROM contacts
        WHERE company IN (
            'Acme Corporation',
            'TechStart Solutions',
            'Global Dynamics Inc.',
            'Innovation Labs',
            'Digital Ventures',
            'Cloud Systems Ltd.',
            'Enterprise Solutions',
            'Future Technologies',
            'Smart Business Group',
            'Advanced Systems Co.',
            'Prime Industries',
            'Elite Services Inc.',
            'Strategic Partners LLC',
            'NextGen Technologies',
            'Modern Solutions Group',
            'ProActive Industries',
            'Visionary Enterprises',
            'Excellence Corp.',
            'Summit Business Solutions',
            'Pinnacle Technologies'
        )
    )
);

-- Delete leads with sample company names
DELETE FROM leads
WHERE contact_id IN (
    SELECT id FROM contacts
    WHERE company IN (
        'Acme Corporation',
        'TechStart Solutions',
        'Global Dynamics Inc.',
        'Innovation Labs',
        'Digital Ventures',
        'Cloud Systems Ltd.',
        'Enterprise Solutions',
        'Future Technologies',
        'Smart Business Group',
        'Advanced Systems Co.',
        'Prime Industries',
        'Elite Services Inc.',
        'Strategic Partners LLC',
        'NextGen Technologies',
        'Modern Solutions Group',
        'ProActive Industries',
        'Visionary Enterprises',
        'Excellence Corp.',
        'Summit Business Solutions',
        'Pinnacle Technologies'
    )
);

-- Delete contacts with sample company names
DELETE FROM contacts
WHERE company IN (
    'Acme Corporation',
    'TechStart Solutions',
    'Global Dynamics Inc.',
    'Innovation Labs',
    'Digital Ventures',
    'Cloud Systems Ltd.',
    'Enterprise Solutions',
    'Future Technologies',
    'Smart Business Group',
    'Advanced Systems Co.',
    'Prime Industries',
    'Elite Services Inc.',
    'Strategic Partners LLC',
        'NextGen Technologies',
    'Modern Solutions Group',
    'ProActive Industries',
    'Visionary Enterprises',
    'Excellence Corp.',
    'Summit Business Solutions',
    'Pinnacle Technologies'
);

-- Remove sample verticals (set to NULL)
UPDATE leads
SET verticals = NULL,
    updated_at = NOW()
WHERE verticals IS NOT NULL;

COMMIT;

-- =====================================================
-- STEP 4: Verify Deletion
-- =====================================================
-- Check remaining data counts

SELECT 'Remaining Contacts' as table_name, COUNT(*) as count FROM contacts
UNION ALL
SELECT 'Remaining Leads', COUNT(*) FROM leads
UNION ALL
SELECT 'Remaining Cold Calls', COUNT(*) FROM cold_calls
UNION ALL
SELECT 'Remaining Onsite Visits', COUNT(*) FROM onsite_visits
UNION ALL
SELECT 'Remaining Activities', COUNT(*) FROM activities
UNION ALL
SELECT 'Remaining Tasks', COUNT(*) FROM team_tasks
UNION ALL
SELECT 'Remaining Deals', COUNT(*) FROM deals;
