/**
 * Script to check if onsite_visits table has the required columns
 * and add them if they don't exist
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAndAddColumns() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if columns exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'onsite_visits' 
      AND column_name IN ('in_time', 'out_time', 'rescheduled_date');
    `;

    const result = await client.query(checkQuery);
    const existingColumns = result.rows.map(row => row.column_name);
    
    console.log('Existing columns:', existingColumns);

    // Add missing columns
    if (!existingColumns.includes('in_time')) {
      console.log('Adding in_time column...');
      await client.query('ALTER TABLE onsite_visits ADD COLUMN IF NOT EXISTS in_time TIME');
      console.log('✅ Added in_time column');
    }

    if (!existingColumns.includes('out_time')) {
      console.log('Adding out_time column...');
      await client.query('ALTER TABLE onsite_visits ADD COLUMN IF NOT EXISTS out_time TIME');
      console.log('✅ Added out_time column');
    }

    if (!existingColumns.includes('rescheduled_date')) {
      console.log('Adding rescheduled_date column...');
      await client.query('ALTER TABLE onsite_visits ADD COLUMN IF NOT EXISTS rescheduled_date TEXT');
      console.log('✅ Added rescheduled_date column');
    }

    console.log('\n✅ All required columns exist!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAndAddColumns();

