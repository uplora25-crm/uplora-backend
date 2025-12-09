/**
 * Database Connection Module
 * 
 * This file creates and exports a PostgreSQL database connection pool.
 * It uses the 'pg' library to connect to the Supabase Postgres database.
 * 
 * The connection string is read from the DATABASE_URL environment variable.
 * This allows us to reuse database connections efficiently across the application.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Validate DATABASE_URL is set (fail fast with clear error)
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Please configure DATABASE_URL in your environment variables.'
  );
}

// Create a connection pool
// A pool manages multiple database connections, which is more efficient than
// creating a new connection for every database query
// SERVERLESS: Pool creation doesn't block - connections are lazy
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optimized for serverless: lazy connection, smaller pool
  max: 5, // Reduced for serverless (was 20)
  idleTimeoutMillis: 10000, // Close idle clients faster (was 30000)
  connectionTimeoutMillis: 3000, // Faster timeout for serverless (was 5000)
  // Don't create connections immediately - connect on first query
  allowExitOnIdle: true, // Allow process to exit when pool is idle (serverless-friendly)
  // Prevent pool from attempting to connect on creation
  // Connections will be established on first query only
});

// Set timezone to UTC for all connections to ensure consistent timestamp handling
// This ensures that TIMESTAMP without timezone values are interpreted as UTC
pool.on('connect', async (client: any) => {
  await client.query("SET timezone = 'UTC'");
});

// Handle pool errors (log them but don't crash the app)
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in serverless - just log the error
});

// NOTE: Removed synchronous connection test for serverless compatibility
// The pool will connect lazily when first query is made
// This prevents timeout during serverless function initialization

// Export the pool so other modules can use it to run queries
export default pool;

// Export PoolClient type for use in services that need transaction support
export type { PoolClient } from 'pg';

