/**
 * Migration Runner Script for lead_id column
 * 
 * This script reads SQL from backend/migrations/012_add_lead_id_to_contacts.sql
 * and executes it in the Supabase database using direct PostgreSQL connection.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting lead_id migration...\n');

    // Validate connection string
    if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
      throw new Error(
        'Missing database connection string. Please set SUPABASE_DB_URL or DATABASE_URL in your .env file.\n' +
        'Format: postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres'
      );
    }

    // Connect to database
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read the SQL migration file
    const migrationPath = join(__dirname, '../migrations/012_add_lead_id_to_contacts.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);
    
    const sql = readFileSync(migrationPath, 'utf-8');
    
    if (!sql || sql.trim().length === 0) {
      throw new Error('Migration file is empty');
    }

    console.log('✅ Migration file read successfully');
    console.log('📝 Executing SQL statements...\n');

    // Execute the entire SQL file
    await client.query(sql);

    console.log('✅ SQL statements executed successfully\n');

    // Verify the column was added
    const checkColumnQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'contacts'
      AND column_name = 'lead_id';
    `;
    
    const checkResult = await client.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      const column = checkResult.rows[0];
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SUCCESS: Migration completed!');
      console.log(`📊 Column 'lead_id' added to 'contacts' table`);
      console.log(`   Type: ${column.data_type}`);
      console.log(`   Nullable: ${column.is_nullable}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('⚠️  WARNING: Column check did not find lead_id column');
    }

    // Check how many clients were backfilled
    const backfillCheckQuery = `
      SELECT COUNT(*) as count
      FROM contacts
      WHERE is_client = true AND lead_id IS NOT NULL;
    `;
    const backfillResult = await client.query(backfillCheckQuery);
    const backfilledCount = parseInt(backfillResult.rows[0].count, 10);
    console.log(`📈 Clients with lead_id: ${backfilledCount}`);

    await client.end();
    process.exit(0);

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ FAILURE: Migration failed!');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

// Run the migration
runMigration();

