/**
 * Health Check Endpoint for Vercel Serverless
 * 
 * This is a standalone handler that:
 * - Doesn't import the main app.ts to avoid initialization overhead
 * - Checks database connectivity with optimized timeouts
 * - Uses transaction pooler (port 6543) for serverless
 * - Returns execution time for debugging
 * - Handles errors gracefully
 */

import { Pool } from 'pg';

// Vercel serverless function types
type VercelRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
  query?: Record<string, string | string[]>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  setHeader: (name: string, value: string) => void;
};

// Connection timeout: 5 seconds (must be less than function timeout of 10s)
const CONNECTION_TIMEOUT_MS = 5000;
const QUERY_TIMEOUT_MS = 5000;

// Create a lightweight database pool for health checks only
function createHealthCheckPool(): Pool | null {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not set - health check will skip DB connectivity');
    return null;
  }

  // Validate connection string uses transaction pooler (port 6543)
  // This is critical for Vercel serverless functions
  try {
    const url = new URL(databaseUrl);
    const port = url.port ? parseInt(url.port) : 5432;
    
    if (port !== 6543) {
      console.warn(
        `⚠️  WARNING: DATABASE_URL uses port ${port} instead of 6543 (transaction pooler). ` +
        `For Vercel serverless, use port 6543: ` +
        `postgresql://user:password@db.[project-ref].supabase.co:6543/postgres`
      );
    }
  } catch (e) {
    console.warn('⚠️  Could not parse DATABASE_URL for port validation');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    // Optimized for serverless health checks
    max: 1, // Single connection for health check
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    allowExitOnIdle: true,
  });

  // Set statement timeout for all connections in this pool
  pool.on('connect', async (client: any) => {
    try {
      await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`);
    } catch (err: any) {
      console.error('[Health Check] Error setting statement timeout:', err.message);
    }
  });

  return pool;
}

// Singleton pool instance (reused across warm invocations)
let healthCheckPool: Pool | null = null;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  
  // Set headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log(`[Health Check] Request received at ${new Date().toISOString()}`);

    // Initialize pool if not exists (warm container optimization)
    if (!healthCheckPool) {
      const poolInitStart = Date.now();
      healthCheckPool = createHealthCheckPool();
      const poolInitTime = Date.now() - poolInitStart;
      console.log(`[Health Check] Pool initialization: ${poolInitTime}ms`);
    }

    const healthStatus: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'uplora-crm-api',
      checks: {
        api: { status: 'ok', responseTime: 0 },
        database: { status: 'unknown', responseTime: 0 },
      },
    };

    // API check (always passes)
    const apiCheckTime = Date.now() - startTime;
    healthStatus.checks.api.responseTime = apiCheckTime;

    // Database connectivity check
    if (healthCheckPool) {
      const dbCheckStart = Date.now();
      try {
        // Simple, fast query to test connectivity
        // Use Promise.race to enforce timeout
        const queryPromise = healthCheckPool.query('SELECT 1 as health');
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), QUERY_TIMEOUT_MS)
        );

        await Promise.race([queryPromise, timeoutPromise]);
        
        const dbCheckTime = Date.now() - dbCheckStart;
        healthStatus.checks.database = {
          status: 'ok',
          responseTime: dbCheckTime,
        };
        console.log(`[Health Check] Database connectivity: OK (${dbCheckTime}ms)`);
      } catch (dbError: any) {
        const dbCheckTime = Date.now() - dbCheckStart;
        healthStatus.checks.database = {
          status: 'error',
          responseTime: dbCheckTime,
          error: dbError.message || 'Database connection failed',
        };
        console.error(`[Health Check] Database connectivity: FAILED (${dbCheckTime}ms)`, dbError);
        // Don't fail entire health check if DB is down - API is still responsive
      }
    } else {
      healthStatus.checks.database = {
        status: 'skipped',
        reason: 'DATABASE_URL not configured',
      };
      console.log('[Health Check] Database check skipped (no DATABASE_URL)');
    }

    // Calculate total execution time
    const totalTime = Date.now() - startTime;
    healthStatus.responseTime = totalTime;

    // Determine overall status
    if (healthStatus.checks.database.status === 'error') {
      // API is ok but DB is down - return 503 (Service Unavailable)
      res.status(503).json({
        ...healthStatus,
        status: 'degraded',
        message: 'API is operational but database is unavailable',
      });
    } else {
      // All checks passed
      res.status(200).json(healthStatus);
    }

    console.log(`[Health Check] Completed in ${totalTime}ms`);
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`[Health Check] Error after ${totalTime}ms:`, error);

    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      error: error.message || 'Internal server error',
    });
  }
}

