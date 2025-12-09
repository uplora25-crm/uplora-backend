/**
 * Routes Index File
 * 
 * This file serves as the central router configuration.
 * Import all route modules here and mount them to the Express app.
 * 
 * Example usage:
 * - Import route modules: import leadsRoutes from './leads';
 * - Mount routes: app.use('/api/leads', leadsRoutes);
 */

import { Router, Request, Response } from 'express';

// Create a router instance
const router = Router();

// Health check route (can be moved here from main index.ts if preferred)
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API routes are working' });
});

// Import and mount route modules here
// Example:
// import leadsRoutes from './leads';
// router.use('/leads', leadsRoutes);

// Export the router to be used in the main app
export default router;

