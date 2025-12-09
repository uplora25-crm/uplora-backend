-- Migration: Update all existing contacts with sample company names
-- This migration assigns sample company names to contacts that don't have one

-- Array of sample company names
DO $$
DECLARE
    company_names TEXT[] := ARRAY[
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
    ];
    contact_record RECORD;
    company_index INTEGER;
    total_contacts INTEGER;
    updated_count INTEGER := 0;
    row_number INTEGER := 0;
BEGIN
    -- Get total count of contacts without company names
    SELECT COUNT(*) INTO total_contacts
    FROM contacts
    WHERE company IS NULL OR company = '';
    
    -- Update each contact with a sample company name
    FOR contact_record IN 
        SELECT id FROM contacts 
        WHERE company IS NULL OR company = ''
        ORDER BY id
    LOOP
        -- Use row number to cycle through company names (works with both integer and UUID IDs)
        row_number := row_number + 1;
        company_index := ((row_number - 1) % array_length(company_names, 1)) + 1;
        
        UPDATE contacts
        SET company = company_names[company_index],
            updated_at = NOW()
        WHERE id = contact_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Updated % contacts with sample company names', updated_count;
END $$;

