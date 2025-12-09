/**
 * Script to run the migration: 017_add_created_by_to_leads.sql
 * 
 * This script adds the created_by_email column to the leads table.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../src/lib/db';

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration: 017_add_created_by_to_leads.sql');
    
    // Read the migration file
    const migrationPath = join(__dirname, '../migrations/017_add_created_by_to_leads.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

