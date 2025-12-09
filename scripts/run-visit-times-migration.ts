/**
 * Migration Runner Script for 011_add_visit_times_to_onsite_visits.sql
 * 
 * This script reads SQL from backend/migrations/011_add_visit_times_to_onsite_visits.sql
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
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  });

  try {
    console.log('🚀 Starting migration: Add in_time, out_time, rescheduled_date to onsite_visits...\n');

    // Validate connection string
    if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_URL) {
      throw new Error(
        'Missing database connection string. Please set DATABASE_URL or SUPABASE_DB_URL in your .env file.'
      );
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read the SQL migration file
    const migrationPath = join(__dirname, '../migrations/011_add_visit_times_to_onsite_visits.sql');
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

    // Verify columns were added
    const verifyQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'onsite_visits'
      AND column_name IN ('in_time', 'out_time', 'rescheduled_date')
      ORDER BY column_name;
    `;

    const verifyResult = await client.query(verifyQuery);
    const columnsAdded = verifyResult.rows.map((row: any) => row.column_name);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUCCESS: Migration completed!');
    if (columnsAdded.length > 0) {
      console.log(`📊 Columns added: ${columnsAdded.join(', ')}`);
    } else {
      console.log('📊 Columns may have already existed (using IF NOT EXISTS)');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await client.end();
    process.exit(0);

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ FAILURE: Migration failed!');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

// Run the migration
runMigration();

