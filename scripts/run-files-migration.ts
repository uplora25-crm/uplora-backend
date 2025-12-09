/**
 * Files Migration Runner Script
 * 
 * This script runs the client_project_files table migration.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runFilesMigration() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting files migration...\n');

    // Validate connection string
    if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
      throw new Error(
        'Missing database connection string. Please set SUPABASE_DB_URL or DATABASE_URL in your .env file.\n' +
        'Format: postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres'
      );
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read the SQL migration file
    const migrationPath = join(__dirname, '../migrations/003_add_client_project_files.sql');
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

    // Verify table was created
    const checkQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'client_project_files';
    `;

    const result = await client.query(checkQuery);

    if (result.rows.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SUCCESS: Migration completed!');
      console.log('📊 Table created: client_project_files');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      throw new Error('Table was not created');
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
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

// Run the migration
runFilesMigration();

