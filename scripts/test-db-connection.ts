/**
 * Test Database Connection Script
 * 
 * This script helps verify your DATABASE_URL configuration without exposing sensitive data.
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config({ path: join(dirname(__dirname), '.env') });

async function testConnection() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  console.log('🔍 Testing Database Connection...\n');

  // Check if DATABASE_URL is set
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL or SUPABASE_DB_URL not found in environment variables');
    console.log('\n💡 Please set DATABASE_URL in your backend/.env file:');
    console.log('   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres');
    process.exit(1);
  }

  // Parse and display hostname (without exposing password)
  try {
    const url = new URL(connectionString);
    console.log('📋 Connection Details:');
    console.log(`   Protocol: ${url.protocol.replace(':', '')}`);
    console.log(`   Hostname: ${url.hostname}`);
    console.log(`   Port: ${url.port || '5432 (default)'}`);
    console.log(`   Database: ${url.pathname.replace('/', '') || 'postgres (default)'}`);
    console.log(`   Username: ${url.username || 'postgres (default)'}`);
    console.log('   Password: [hidden]');
    console.log('');
  } catch (err) {
    console.error('⚠️  Warning: Could not parse DATABASE_URL');
    const hostMatch = connectionString.match(/@([^:/]+)/);
    if (hostMatch) {
      console.log(`   Hostname: ${hostMatch[1]}`);
    }
    console.log('');
  }

  // Attempt connection
  const client = new Client({
    connectionString: connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('🔌 Attempting to connect...');
    await client.connect();
    console.log('✅ Connection successful!\n');

    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('📊 Database Information:');
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(',')[0]}`);
    console.log('\n✅ Database connection is working correctly!');

    await client.end();
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Connection failed!\n');
    
    if (err.message.includes('getaddrinfo ENOENT')) {
      console.error('⚠️  DNS Lookup Error:');
      console.error('   The hostname could not be resolved.');
      console.error('   This usually means:');
      console.error('   1. The hostname in DATABASE_URL is incorrect');
      console.error('   2. The Supabase project was deleted or renamed');
      console.error('   3. There is a network connectivity issue');
      console.error('\n💡 Next Steps:');
      console.error('   1. Go to https://supabase.com/dashboard');
      console.error('   2. Select your project → Settings → Database');
      console.error('   3. Copy the correct connection string');
      console.error('   4. Update DATABASE_URL in backend/.env');
    } else if (err.message.includes('password authentication failed')) {
      console.error('⚠️  Authentication Error:');
      console.error('   The password is incorrect.');
      console.error('   Please verify your database password in the Supabase Dashboard.');
    } else if (err.message.includes('connection refused')) {
      console.error('⚠️  Connection Refused:');
      console.error('   The database server refused the connection.');
      console.error('   Check if:');
      console.error('   1. The port number is correct (5432 for direct, 6543 for pooled)');
      console.error('   2. Your IP is allowed in Supabase Dashboard → Settings → Database → Connection Pooling');
      console.error('   3. The database is not paused or deleted');
    } else if (err.message.includes('timeout')) {
      console.error('⚠️  Connection Timeout:');
      console.error('   Could not connect within the timeout period.');
      console.error('   Check your network connection and firewall settings.');
    } else {
      console.error('Error Details:');
      console.error(`   ${err.message}`);
    }

    await client.end().catch(() => {});
    process.exit(1);
  }
}

// Run the test
testConnection().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

