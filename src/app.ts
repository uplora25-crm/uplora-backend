/**
 * Uplora CRM Backend - Express Application
 * 
 * This file initializes the Express application with middleware and routes.
 * It does NOT start the server (no app.listen()).
 * 
 * Optimized for Vercel serverless:
 * - Compression enabled for faster responses
 * - Cache headers for read-heavy endpoints
 * - Singleton clients initialized at module level (reused across requests)
 * 
 * Used by:
 * - src/index.ts (local development server)
 * - api/index.ts (Vercel serverless function)
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables from .env file (done once at module load)
dotenv.config();

// Create Express application instance FIRST
// This allows us to define the health endpoint before importing routes
const app: Express = express();

// ============================================================================
// Health Check Endpoint (defined BEFORE routes to avoid import chain)
// ============================================================================
// Health check endpoint - useful for monitoring and testing
// GET /api/health → returns { status: "ok" }
// Defined early so it works even if routes have initialization issues
app.get('/api/health', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ status: 'ok' });
});

// Initialize singleton clients at module level (cold-start optimization)
// These are created once per container and reused across requests
import './lib/supabase'; // Initialize Supabase client singleton
// Database pool - created lazily, no blocking connections
// Services will import it when needed

// Import route modules (imported after health endpoint is defined)
// Routes import controllers → services → db, so this happens after health endpoint
import leadsRouter from './routes/leads';
import dashboardRouter from './routes/dashboard';
import dealsRouter from './routes/deals';
import tasksRouter from './routes/tasks';
import callsRouter from './routes/calls';
import visitsRouter from './routes/visits';
import clientsRouter from './routes/clients';
import activitiesRouter from './routes/activities';
import teamRouter from './routes/team';
import credentialsRouter from './routes/credentials';
import filesRouter from './routes/files';
import notificationsRouter from './routes/notifications';
import chatRouter from './routes/chat';
import pricingRouter from './routes/pricing';
import presentationsRouter from './routes/presentations';

// ============================================================================
// Performance Middleware
// ============================================================================

// Compression middleware - reduces response size by 60-80%
// Compresses responses using gzip/deflate when client supports it
app.use(compression({
  filter: (req: Request, res: Response) => {
    // Don't compress if client explicitly doesn't want compression
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  },
  // Compression threshold: only compress responses > 1KB
  threshold: 1024,
}));

// ============================================================================
// CORS Configuration
// ============================================================================

// CORS allows the frontend (running on different port) to make requests to this API
const corsOptions = process.env.FRONTEND_URL 
  ? {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email'],
    }
  : {
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email'],
    };
app.use(cors(corsOptions));

// ============================================================================
// Request Timeout Middleware (for serverless)
// ============================================================================

// Add request timeout protection for Vercel serverless
// This prevents requests from hanging indefinitely
app.use((req: Request, res: Response, next) => {
  // Set request start time
  (req as any).startTime = Date.now();
  
  // Set a timeout to prevent hanging requests (25s - less than function timeout)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`[App] Request timeout after 25s: ${req.method} ${req.url}`);
      res.status(504).json({
        success: false,
        error: 'Gateway Timeout',
        message: 'Request took too long to process',
      });
    }
  }, 25000); // 25s timeout

  // Clear timeout when response is sent
  res.on('finish', () => {
    clearTimeout(timeout);
    const duration = Date.now() - ((req as any).startTime || 0);
    if (duration > 5000) {
      console.log(`[App] Slow request: ${duration}ms for ${req.method} ${req.url}`);
    }
  });

  next();
});

// ============================================================================
// Body Parsing Middleware
// ============================================================================

// Parse JSON request bodies (allows us to read JSON data from requests)
app.use(express.json({
  limit: '10mb', // Limit JSON payload size
}));

// Parse URL-encoded request bodies (for form data)
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb', // Limit form data size
}));

// ============================================================================
// API Routes
// ============================================================================
// Mount the leads router at /api/leads
// This means all routes in leadsRouter will be prefixed with /api/leads
app.use('/api/leads', leadsRouter);

// Mount the dashboard router at /api/dashboard
// This means all routes in dashboardRouter will be prefixed with /api/dashboard
// Example: router.get('/summary') becomes GET /api/dashboard/summary
app.use('/api/dashboard', dashboardRouter);

// Mount the deals router at /api/deals
// This means all routes in dealsRouter will be prefixed with /api/deals
// Example: router.get('/pipeline') becomes GET /api/deals/pipeline
// Example: router.post('/') becomes POST /api/deals
// Example: router.patch('/:id/stage') becomes PATCH /api/deals/:id/stage
app.use('/api/deals', dealsRouter);

// Mount the tasks router at /api
// This router mixes /tasks/my and /leads/:id/tasks endpoints
app.use('/api', tasksRouter);

// Mount the calls router at /api/calls
app.use('/api/calls', callsRouter);

// Mount the visits router at /api/visits
app.use('/api/visits', visitsRouter);

// Mount the clients router at /api/clients
app.use('/api/clients', clientsRouter);

// Mount the activities router at /api/activities
app.use('/api/activities', activitiesRouter);

// Mount the team router at /api/team
app.use('/api/team', teamRouter);

// Mount the credentials router at /api
// This router handles /api/clients/:clientId/credentials and /api/credentials/:id
app.use('/api', credentialsRouter);

// Mount the files router at /api
// This router handles /api/clients/:clientId/files and /api/files/:id
app.use('/api', filesRouter);

// Mount the notifications router at /api/notifications
app.use('/api/notifications', notificationsRouter);

// Mount the chat router at /api/chat
app.use('/api/chat', chatRouter);

// Mount the pricing router at /api/pricing
app.use('/api/pricing', pricingRouter);

// Mount the presentations router at /api
app.use('/api', presentationsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to Uplora CRM API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      leads: '/api/leads',
      dashboard: '/api/dashboard',
      deals: '/api/deals',
      tasks: '/api/tasks',
      calls: '/api/calls',
      visits: '/api/visits',
      clients: '/api/clients',
      activities: '/api/activities',
      team: '/api/team',
      credentials: '/api/clients/:clientId/credentials',
      files: '/api/clients/:clientId/files'
    }
  });
});

// Export app for use by server entry points
export default app;

