/**
 * Dashboard Routes Module
 * 
 * This file defines the HTTP routes (endpoints) for the dashboard API.
 * Routes map URLs to controller functions that handle the requests.
 * 
 * Example:
 *   GET /api/dashboard/summary → calls getDashboardSummary controller
 */

import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { setCacheHeaders } from '../middleware/cache.middleware';

// Create a new router instance
// A router is like a mini-app that handles a group of related routes
const router = Router();

/**
 * GET /api/dashboard/summary
 * Retrieves a comprehensive dashboard summary with aggregated statistics
 * 
 * Example: GET /api/dashboard/summary
 * Returns: { success: true, data: { totalLeads, newLeadsThisWeek, leadsByStage, ... } }
 * 
 * Flow: Client requests summary → controller calls service → service queries database → return summary
 * 
 * This endpoint provides a 360° view of the CRM system including:
 * - Total leads and new leads this week
 * - Leads grouped by stage (new, qualified, proposal, negotiation, closed)
 * - Leads grouped by status (new, contacted, won, lost)
 * - Total cold calls and onsite visits
 * - Recent activity feed (5 most recent activities)
 * 
 * Cached for 30s (short cache) - dashboard data changes frequently
 */
router.get('/summary', setCacheHeaders('short'), dashboardController.getDashboardSummary);

// Export the router so it can be used in the main app (index.ts)
export default router;

