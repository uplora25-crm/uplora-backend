/**
 * Script to add verticals column to leads table
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runVerticalsMigration() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting verticals migration...\n');

    // Validate connection string
    if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
      throw new Error(
        'Missing database connection string. Please set SUPABASE_DB_URL or DATABASE_URL in your .env file.'
      );
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read and execute migration
    const migrationPath = join(__dirname, '../migrations/004_add_verticals_to_leads.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);
    
    const sql = readFileSync(migrationPath, 'utf-8');
    
    if (!sql || sql.trim().length === 0) {
      throw new Error('Migration file is empty');
    }

    console.log('✅ Migration file read successfully');
    console.log('📝 Executing SQL statements...\n');

    await client.query(sql);

    console.log('✅ Verticals column added successfully\n');

    // Verify the column was added
    const verifyQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'verticals';
    `;

    const result = await client.query(verifyQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Verification: Verticals column exists in leads table');
      console.log(`   Column type: ${result.rows[0].data_type}\n`);
    } else {
      console.log('⚠️  Warning: Could not verify verticals column\n');
    }

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
runVerticalsMigration();

