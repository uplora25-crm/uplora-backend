import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runDeletedAtMigration() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting deleted_at migration...\n');

    if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
      throw new Error(
        'Missing database connection string. Please set SUPABASE_DB_URL or DATABASE_URL in your .env file.'
      );
    }

    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Adding deleted_at column to contacts table...\n');
    
    const migrationPath = join(__dirname, '../migrations/008_add_deleted_at_to_contacts.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);
    
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    
    if (!migrationSql || migrationSql.trim().length === 0) {
      throw new Error('Migration file is empty');
    }

    console.log('✅ Migration file read successfully');
    console.log('📝 Executing SQL statements...\n');

    await client.query(migrationSql);
    console.log('✅ deleted_at column added successfully\n');

    const countQuery = `
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_count,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count
      FROM contacts;
    `;

    const result = await client.query(countQuery);
    const stats = result.rows[0];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Final Statistics:');
    console.log(`   Total contacts: ${stats.total_contacts}`);
    console.log(`   Active contacts: ${stats.active_count}`);
    console.log(`   Deleted contacts: ${stats.deleted_count}`);
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

runDeletedAtMigration();

