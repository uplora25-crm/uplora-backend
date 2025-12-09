-- Migration: Update sample verticals for all leads
-- This script assigns sample vertical values to all leads that don't have a vertical set

DO $$
DECLARE
    lead_record RECORD;
    verticals_list TEXT[] := ARRAY[
        'Healthcare',
        'Finance & Banking',
        'Technology',
        'Retail & E-commerce',
        'Manufacturing',
        'Real Estate',
        'Education',
        'Hospitality & Travel',
        'Energy & Utilities',
        'Media & Entertainment',
        'Legal Services',
        'Consulting'
    ];
    num_verticals INT := array_length(verticals_list, 1);
    random_index INT;
BEGIN
    FOR lead_record IN
        SELECT id
        FROM leads
        WHERE verticals IS NULL OR verticals = ''
    LOOP
        -- Use a hash of the ID to get a somewhat random but consistent index
        random_index := (('x' || substring(md5(lead_record.id::text), 1, 8))::bit(32)::int % num_verticals) + 1;
        UPDATE leads
        SET verticals = verticals_list[random_index],
            updated_at = NOW()
        WHERE id = lead_record.id;
    END LOOP;
END $$;

-- Verify the update
SELECT 
    verticals,
    COUNT(*) as count
FROM leads
WHERE verticals IS NOT NULL AND verticals != ''
GROUP BY verticals
ORDER BY count DESC;

