/**
 * Run Pricing Migration
 *
 * This script runs the migration to create the subscription_plans table.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../src/lib/db';

async function runMigration() {
  const migrationPath = join(__dirname, '../migrations/010_add_subscription_plans.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  try {
    console.log('Running subscription plans migration...');
    await pool.query(migrationSQL);
    console.log('✅ Subscription plans migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists, skipping...');
      process.exit(0);
    }
    process.exit(1);
  }
}

runMigration();

