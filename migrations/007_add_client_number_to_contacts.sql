-- Add client_number column to contacts table
-- This will store unique client numbers for clients (contacts with is_client = true)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS client_number VARCHAR(50) UNIQUE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_client_number ON contacts(client_number);

-- Generate client numbers for existing clients
-- Format: CLT-000001, CLT-000002, etc.
DO $$
DECLARE
    contact_record RECORD;
    client_counter INT := 1;
    new_client_number VARCHAR(50);
BEGIN
    FOR contact_record IN 
        SELECT id FROM contacts 
        WHERE is_client = true 
        ORDER BY created_at ASC
    LOOP
        new_client_number := 'CLT-' || LPAD(client_counter::TEXT, 6, '0');
        
        UPDATE contacts
        SET client_number = new_client_number
        WHERE id = contact_record.id;
        
        client_counter := client_counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Updated % clients with client numbers.', client_counter - 1;
END $$;

