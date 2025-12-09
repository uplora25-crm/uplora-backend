/**
 * Script to add company column and update all contacts with sample company names
 * 
 * This script runs both migrations:
 * 1. Adds company column to contacts table
 * 2. Updates all existing contacts with sample company names
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runCompanyMigrations() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting company migrations...\n');

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

    // Step 1: Add company column
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 1: Adding company column to contacts table...\n');
    
    const addColumnPath = join(__dirname, '../migrations/002_add_company_to_contacts.sql');
    console.log(`📖 Reading migration file: ${addColumnPath}`);
    
    const addColumnSql = readFileSync(addColumnPath, 'utf-8');
    
    if (!addColumnSql || addColumnSql.trim().length === 0) {
      throw new Error('Add column migration file is empty');
    }

    console.log('✅ Migration file read successfully');
    console.log('📝 Executing SQL statements...\n');

    await client.query(addColumnSql);
    console.log('✅ Company column added successfully\n');

    // Step 2: Update company names
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 2: Updating contacts with sample company names...\n');
    
    const updateNamesPath = join(__dirname, '../migrations/003_update_sample_company_names.sql');
    console.log(`📖 Reading migration file: ${updateNamesPath}`);
    
    const updateNamesSql = readFileSync(updateNamesPath, 'utf-8');
    
    if (!updateNamesSql || updateNamesSql.trim().length === 0) {
      throw new Error('Update names migration file is empty');
    }

    console.log('✅ Migration file read successfully');
    console.log('📝 Executing SQL statements...\n');

    await client.query(updateNamesSql);
    console.log('✅ Company names updated successfully\n');

    // Verify the update
    const countQuery = `
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(company) as contacts_with_company,
        COUNT(*) - COUNT(company) as contacts_without_company
      FROM contacts;
    `;

    const result = await client.query(countQuery);
    const stats = result.rows[0];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Final Statistics:');
    console.log(`   Total contacts: ${stats.total_contacts}`);
    console.log(`   Contacts with company: ${stats.contacts_with_company}`);
    console.log(`   Contacts without company: ${stats.contacts_without_company}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ All migrations completed successfully!');

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Error running migrations:', error.message);
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

// Run the migrations
runCompanyMigrations();

