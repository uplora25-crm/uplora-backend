/**
 * Vercel Serverless Function Handler
 * 
 * This is the main entry point for all API routes (except /api/health which has its own handler).
 * Optimized for Vercel serverless with:
 * - Lazy app initialization with caching (warm container optimization)
 * - Initialization timing logs for debugging
 * - Comprehensive error handling
 */

import serverless from "serverless-http";

// Lazy initialization with caching - only import app when needed
// This prevents slow initialization from blocking the function on cold starts
let appInstance: any = null;
let serverlessHandler: any = null;

function getApp() {
  // If already initialized (warm container), return cached instance
  if (appInstance) {
    return appInstance;
  }

  // Track initialization time for debugging
  const initStart = Date.now();
  console.log('[API] Initializing Express app (cold start)...');

  try {
    // Import app (this loads all routes, controllers, services)
    // Using require() for lazy loading instead of top-level import
    const app = require("../src/app").default;
    appInstance = app;

    const initTime = Date.now() - initStart;
    console.log(`[API] Express app initialized in ${initTime}ms`);

    // Warn if initialization is slow
    if (initTime > 5000) {
      console.warn(`[API] ⚠️  Slow initialization: ${initTime}ms (consider optimizing route imports)`);
    }

    return appInstance;
  } catch (error: any) {
    const initTime = Date.now() - initStart;
    console.error(`[API] ❌ Failed to initialize app after ${initTime}ms:`, error.message);
    throw error;
  }
}

function getHandler() {
  // If already created (warm container), return cached handler
  if (serverlessHandler) {
    return serverlessHandler;
  }

  const app = getApp();
  
  // Create serverless handler with optimized settings
  serverlessHandler = serverless(app, {
    // Request/response transformation for logging
    request: (request: any) => {
      // Track request start time for performance monitoring
      (request as any).__startTime = Date.now();
      return request;
    },
    response: (response: any, request: any) => {
      // Log slow responses for debugging
      const startTime = (request as any)?.__startTime;
      if (startTime) {
        const responseTime = Date.now() - startTime;
        if (responseTime > 3000) {
          console.log(`[API] ⚠️  Slow response: ${responseTime}ms for ${request?.url || request?.path || 'unknown'}`);
        }
      }
      return response;
    },
  });

  return serverlessHandler;
}

// Main handler function - Vercel will call this for all requests routed to /api/*
export default async function handler(req: any, res: any) {
  const requestStartTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[API:${requestId}] ${req.method} ${req.url || req.path || 'unknown'}`);

  try {
    // Get or create the serverless handler (lazy initialization)
    const handler = getHandler();

    // Set a global timeout for the entire request (20s to leave buffer for Vercel)
    const requestTimeout = setTimeout(() => {
      if (!res.headersSent) {
        const elapsed = Date.now() - requestStartTime;
        console.error(`[API:${requestId}] Request timeout after ${elapsed}ms`);
        res.status(504).json({
          success: false,
          error: 'Gateway Timeout',
          message: 'Request took too long to process',
        });
      }
    }, 20000); // 20s timeout (less than Vercel's 30s function timeout)

    // Execute the handler - serverless-http handles the callback
    return new Promise<void>((resolve, reject) => {
      handler(req, res, (err: any) => {
        clearTimeout(requestTimeout);
        
        const totalTime = Date.now() - requestStartTime;
        
        if (err) {
          console.error(`[API:${requestId}] Error after ${totalTime}ms:`, err.message);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Internal server error',
              message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
            });
          }
          reject(err);
        } else {
          if (totalTime > 3000) {
            console.log(`[API:${requestId}] Completed in ${totalTime}ms (slow)`);
          }
          resolve();
        }
      });
    });
  } catch (error: any) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`[API:${requestId}] Failed after ${totalTime}ms:`, error.message);

    // If response hasn't been sent, send error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
      });
    }
    
    throw error;
  }
}

