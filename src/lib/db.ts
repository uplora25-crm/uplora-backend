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

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;

// Log warning if missing, but don't throw (allows health endpoint to work)
// This prevents blocking module initialization in serverless functions
if (!databaseUrl) {
  console.warn(
    '⚠️  WARNING: DATABASE_URL environment variable is not set. ' +
    'Database operations will fail. Please configure DATABASE_URL in your environment variables.'
  );
}

// Create a connection pool
// A pool manages multiple database connections, which is more efficient than
// creating a new connection for every database query
// SERVERLESS: Pool creation doesn't block - connections are lazy
// If DATABASE_URL is missing, create pool with placeholder - will fail when actually used
// This allows app to start but database operations will error at runtime
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      // Optimized for serverless: lazy connection, smaller pool
      max: 5, // Reduced for serverless (was 20)
      idleTimeoutMillis: 10000, // Close idle clients faster (was 30000)
      connectionTimeoutMillis: 10000, // Increased for cold starts - first connection can be slow (was 3000)
      // Don't create connections immediately - connect on first query
      allowExitOnIdle: true, // Allow process to exit when pool is idle (serverless-friendly)
      // Prevent pool from attempting to connect on creation
      // Connections will be established on first query only
    })
  : new Pool({
      // Dummy connection string - will fail when actually used, but allows module to load
      connectionString: 'postgresql://missing:missing@localhost:5432/missing',
      max: 0, // Don't allow any connections
    });

// Set timezone to UTC for all connections to ensure consistent timestamp handling
// This ensures that TIMESTAMP without timezone values are interpreted as UTC
// Only set up event handlers if we have a real database URL
if (databaseUrl) {
  pool.on('connect', async (client: any) => {
    // Set timezone and query timeout for this connection
    await client.query("SET timezone = 'UTC'");
    // Set statement timeout to 25 seconds (must be less than function timeout of 30s)
    await client.query("SET statement_timeout = 25000");
  });

  // Handle pool errors (log them but don't crash the app)
  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit in serverless - just log the error
  });
}

// NOTE: Removed synchronous connection test for serverless compatibility
// The pool will connect lazily when first query is made
// This prevents timeout during serverless function initialization

/**
 * Safely get a client from the pool with timeout protection
 * This prevents pool.connect() from hanging indefinitely
 * 
 * @param timeoutMs - Maximum time to wait for a connection (default: 8000ms)
 * @returns A pool client
 * @throws Error if connection times out or fails
 */
export async function getPoolClient(timeoutMs: number = 8000): Promise<any> {
  return Promise.race([
    pool.connect(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Database connection timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<any>;
}

// Export the pool so other modules can use it to run queries
export default pool;

// Export PoolClient type for use in services that need transaction support
export type { PoolClient } from 'pg';

