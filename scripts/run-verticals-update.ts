/**
 * Script to update all leads with sample vertical values
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runVerticalsUpdate() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting verticals update migration...\n');

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

    // Read and execute migration
    const migrationPath = join(__dirname, '../migrations/005_update_sample_verticals.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);
    
    const sql = readFileSync(migrationPath, 'utf-8');
    
    if (!sql || sql.trim().length === 0) {
      throw new Error('Migration file is empty');
    }

    console.log('✅ Migration file read successfully');
    console.log('📝 Executing SQL statements...\n');

    await client.query(sql);

    console.log('✅ Verticals updated successfully\n');

    // Verify the update
    const distributionQuery = `
      SELECT 
        verticals,
        COUNT(*) as count
      FROM leads
      WHERE verticals IS NOT NULL AND verticals != ''
      GROUP BY verticals
      ORDER BY count DESC
    `;

    const distributionResult = await client.query(distributionQuery);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Verticals Distribution:');
    distributionResult.rows.forEach((row: any) => {
      console.log(`   ${row.verticals}: ${row.count} leads`);
    });

    const totalLeads = await client.query('SELECT COUNT(*) as total FROM leads');
    const leadsWithVerticals = await client.query(`
      SELECT COUNT(*) as count FROM leads WHERE verticals IS NOT NULL AND verticals != ''
    `);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Statistics:');
    console.log(`   Total leads: ${totalLeads.rows[0].total}`);
    console.log(`   Leads with verticals: ${leadsWithVerticals.rows[0].count}`);
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
runVerticalsUpdate();

