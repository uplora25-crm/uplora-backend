/**
 * Migration Runner Script for client_id column in team_tasks
 * 
 * This script reads SQL from backend/migrations/013_add_client_id_to_team_tasks.sql
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
    console.log('🚀 Starting client_id migration for team_tasks...\n');

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
    const migrationPath = join(__dirname, '../migrations/013_add_client_id_to_team_tasks.sql');
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
      AND table_name = 'team_tasks'
      AND column_name = 'client_id';
    `;
    
    const checkResult = await client.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      const column = checkResult.rows[0];
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SUCCESS: Migration completed!');
      console.log(`📊 Column 'client_id' added to 'team_tasks' table`);
      console.log(`   Type: ${column.data_type}`);
      console.log(`   Nullable: ${column.is_nullable}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('⚠️  WARNING: Column check did not find client_id column');
    }

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

