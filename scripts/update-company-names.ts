/**
 * Script to update all contacts with sample company names
 * 
 * This script runs the migration to add company names to all existing contacts
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function updateCompanyNames() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting company name update...\n');

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
    const migrationPath = join(__dirname, '../migrations/003_update_sample_company_names.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);
    
    const sql = readFileSync(migrationPath, 'utf-8');
    
    if (!sql || sql.trim().length === 0) {
      throw new Error('Migration file is empty');
    }

    console.log('✅ Migration file read successfully');
    console.log('📝 Executing SQL statements...\n');

    // Execute the entire SQL file
    await client.query(sql);

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

    console.log('📊 Update Statistics:');
    console.log(`   Total contacts: ${stats.total_contacts}`);
    console.log(`   Contacts with company: ${stats.contacts_with_company}`);
    console.log(`   Contacts without company: ${stats.contacts_without_company}\n`);

    console.log('✅ Migration completed successfully!');

  } catch (error: any) {
    console.error('❌ Error updating company names:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
updateCompanyNames();

