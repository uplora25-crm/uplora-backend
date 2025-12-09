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

// Validate DATABASE_URL format and port for serverless
function validateDatabaseUrl(url: string | undefined): { valid: boolean; warning?: string } {
  if (!url) {
    return {
      valid: false,
      warning: 'DATABASE_URL environment variable is not set. Database operations will fail.',
    };
  }

  try {
    const parsed = new URL(url);
    const port = parsed.port ? parseInt(parsed.port) : 5432;

    // For Vercel serverless, we should use transaction pooler (port 6543)
    // Direct connection (port 5432) can cause connection issues in serverless
    if (port === 5432 && process.env.VERCEL) {
      return {
        valid: true,
        warning: `DATABASE_URL uses port 5432 (direct connection). For Vercel serverless, use port 6543 (transaction pooler): postgresql://${parsed.username}:***@${parsed.hostname}:6543${parsed.pathname}${parsed.search}`,
      };
    }

    if (port !== 6543 && process.env.VERCEL) {
      return {
        valid: true,
        warning: `DATABASE_URL uses port ${port}. Recommended port 6543 (transaction pooler) for Vercel serverless.`,
      };
    }

    return { valid: true };
  } catch (e) {
    return {
      valid: true, // Don't block initialization, but warn
      warning: 'Could not parse DATABASE_URL. Please verify the connection string format.',
    };
  }
}

// Validate and log warnings
const validation = validateDatabaseUrl(databaseUrl);
if (validation.warning) {
  console.warn(`⚠️  WARNING: ${validation.warning}`);
}

// Create a connection pool
// A pool manages multiple database connections, which is more efficient than
// creating a new connection for every database query
// SERVERLESS: Pool creation doesn't block - connections are lazy
// If DATABASE_URL is missing, create pool with placeholder - will fail when actually used
// This allows app to start but database operations will error at runtime

// Timeout configuration optimized for Vercel serverless (10s max function timeout for free tier)
const CONNECTION_TIMEOUT_MS = 5000; // 5s connection timeout (less than function timeout)
const QUERY_TIMEOUT_MS = 5000; // 5s query timeout

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      // Optimized for serverless: lazy connection, smaller pool
      max: 5, // Reduced for serverless (was 20)
      idleTimeoutMillis: 5000, // Close idle clients faster (was 10000)
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS, // 5s - must complete before function times out
      // Don't create connections immediately - connect on first query
      allowExitOnIdle: true, // Allow process to exit when pool is idle (serverless-friendly)
      // Prevent pool from attempting to connect on creation
      // Connections will be established on first query only
      // Note: query_timeout and statement_timeout are set in the 'connect' event handler below
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
    try {
      // Set timezone for this connection
      await client.query("SET timezone = 'UTC'");
      // Set statement timeout (must be less than function timeout)
      // Using 5s to align with pool query_timeout and function timeout constraints
      // PostgreSQL statement_timeout is in milliseconds
      await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`);
    } catch (err: any) {
      // Log but don't throw - connection setup errors shouldn't crash the app
      console.error('[DB] Error setting connection parameters:', err.message);
    }
  });

  // Handle pool errors (log them but don't crash the app)
  pool.on('error', (err: Error) => {
    console.error('[DB] Unexpected error on idle client:', err.message);
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
 * @param timeoutMs - Maximum time to wait for a connection (default: 5000ms)
 * @returns A pool client
 * @throws Error if connection times out or fails
 */
export async function getPoolClient(timeoutMs: number = CONNECTION_TIMEOUT_MS): Promise<any> {
  const startTime = Date.now();
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Database connection timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]) as Promise<any>;
    
    const connectionTime = Date.now() - startTime;
    if (connectionTime > 1000) {
      console.log(`[DB] Connection obtained in ${connectionTime}ms (slow)`);
    }
    
    return client;
  } catch (error: any) {
    const connectionTime = Date.now() - startTime;
    console.error(`[DB] Failed to get pool client after ${connectionTime}ms:`, error.message);
    throw error;
  }
}

/**
 * Execute a query with timeout protection
 * This ensures queries don't hang indefinitely
 * 
 * @param queryText - SQL query string
 * @param params - Query parameters
 * @param timeoutMs - Query timeout in milliseconds (default: 5000ms)
 * @returns Query result
 */
export async function queryWithTimeout(
  queryText: string,
  params: any[] = [],
  timeoutMs: number = QUERY_TIMEOUT_MS
): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Wrap the query in a Promise.race to enforce timeout
    const queryPromise = pool.query(queryText, params);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    const queryTime = Date.now() - startTime;
    if (queryTime > 2000) {
      console.warn(`[DB] Slow query (${queryTime}ms): ${queryText.substring(0, 100)}...`);
    }
    
    return result;
  } catch (error: any) {
    const queryTime = Date.now() - startTime;
    console.error(`[DB] Query failed after ${queryTime}ms:`, error.message);
    throw error;
  }
}

// Export the pool so other modules can use it to run queries
export default pool;

// Export PoolClient type for use in services that need transaction support
export type { PoolClient } from 'pg';

