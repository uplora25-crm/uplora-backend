/**
 * Script to add is_client column to contacts table
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runIsClientMigration() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting is_client migration...\n');

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

    // Run migration
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Adding is_client column to contacts table...\n');
    
    const migrationPath = join(__dirname, '../migrations/006_add_is_client_to_contacts.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);
    
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    
    if (!migrationSql || migrationSql.trim().length === 0) {
      throw new Error('Migration file is empty');
    }

    console.log('✅ Migration file read successfully');
    console.log('📝 Executing SQL statements...\n');

    await client.query(migrationSql);
    console.log('✅ is_client column added successfully\n');

    // Verify the update
    const countQuery = `
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN is_client = true THEN 1 END) as clients,
        COUNT(CASE WHEN is_client = false OR is_client IS NULL THEN 1 END) as non_clients
      FROM contacts;
    `;

    const result = await client.query(countQuery);
    const stats = result.rows[0];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Final Statistics:');
    console.log(`   Total contacts: ${stats.total_contacts}`);
    console.log(`   Clients (is_client=true): ${stats.clients}`);
    console.log(`   Non-clients: ${stats.non_clients}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Migration completed successfully!');

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Error running migration:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runIsClientMigration();

