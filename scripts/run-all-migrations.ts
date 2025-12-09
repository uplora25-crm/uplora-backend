/**
 * Comprehensive Migration Runner Script
 * 
 * This script runs all migrations in order from the backend/migrations directory.
 * Migrations are executed sequentially to ensure proper database schema evolution.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runAllMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
  });

  try {
    console.log('🚀 Starting comprehensive database migration...\n');

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

    // Get all migration files and sort them
    const migrationsDir = join(__dirname, '../migrations');
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically to ensure order

    console.log(`📋 Found ${files.length} migration files\n`);

    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Run each migration
    for (const file of files) {
      const migrationPath = join(migrationsDir, file);
      console.log(`📖 Running: ${file}`);
      
      try {
        const sql = readFileSync(migrationPath, 'utf-8');
        
        if (!sql || sql.trim().length === 0) {
          console.log(`   ⚠️  Skipped (empty file)\n`);
          skippedCount++;
          continue;
        }

        // Execute the migration
        await client.query(sql);
        console.log(`   ✅ Success\n`);
        successCount++;
      } catch (error: any) {
        // Check if error is because object already exists (safe to skip)
        if (error.message && (
          error.message.includes('already exists') ||
          error.message.includes('duplicate') ||
          error.code === '42P07' || // duplicate_table
          error.code === '42710'     // duplicate_object
        )) {
          console.log(`   ⚠️  Skipped (already exists)\n`);
          skippedCount++;
        } else {
          console.log(`   ❌ Failed: ${error.message}\n`);
          errors.push(`${file}: ${error.message}`);
        }
      }
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Failed: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`   - ${err}`));
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await client.end();
    process.exit(errors.length > 0 ? 1 : 0);

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ FAILURE: Migration process failed!');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

// Run all migrations
runAllMigrations();

