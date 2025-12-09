/**
 * Leads Routes Module
 * 
 * This file defines the HTTP routes (endpoints) for the leads API.
 * Routes map URLs to controller functions that handle the requests.
 * 
 * Example:
 *   GET /api/leads → calls getAllLeads controller
 *   POST /api/leads → calls createLead controller
 * 
 * IMPORTANT: More specific routes must come BEFORE parameterized routes.
 * Otherwise Express will match /api/leads/5/timeline as /api/leads/:id with id="5/timeline"
 */

import { Router } from 'express';
import * as leadsController from '../controllers/leads.controller';
import { setCacheHeaders } from '../middleware/cache.middleware';

// Create a new router instance
// A router is like a mini-app that handles a group of related routes
const router = Router();

/**
 * GET /api/leads
 * Retrieves all leads from the database
 * 
 * When a client makes a GET request to /api/leads,
 * Express will call the getAllLeads controller function
 * 
 * Cached for 30s (short cache) - leads list changes frequently
 */
router.get('/', setCacheHeaders('short'), leadsController.getAllLeads);

/**
 * POST /api/leads
 * Creates a new lead (and associated contact) in the database
 * 
 * Expected request body:
 * {
 *   "contact": {
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "phone": "+1-555-0101"
 *   },
 *   "source": "website",
 *   "stage": "new"
 * }
 * 
 * When a client makes a POST request to /api/leads with JSON data,
 * Express will call the createLead controller function
 */
router.post('/', leadsController.createLead);

/**
 * GET /api/leads/:id/timeline
 * Retrieves the complete timeline for a lead, including activities, cold calls, and onsite visits
 * 
 * Example: GET /api/leads/5/timeline
 * Returns: { success: true, data: { activities: [...], coldCalls: [...], onsiteVisits: [...] } }
 * 
 * Flow: Client requests timeline → controller parses ID → service fetches all three types → return grouped timeline
 * 
 * This endpoint groups all timeline events for a lead into three categories:
 * - activities: General activities (notes, emails, etc.)
 * - coldCalls: Outbound calls made to the lead
 * - onsiteVisits: In-person visits to the lead's location
 * 
 * NOTE: This route must come BEFORE /:id to avoid route conflicts
 */
router.get('/:id/timeline', leadsController.getLeadTimeline);

/**
 * POST /api/leads/:id/activities
 * Creates a new activity for a specific lead
 * 
 * Example: POST /api/leads/5/activities
 * Expected request body:
 * {
 *   "activityType": "call",
 *   "description": "Called to follow up on proposal"
 * }
 * 
 * Flow: User submits activity form → controller validates → service inserts → return new activity
 */
router.post('/:id/activities', leadsController.addActivity);

/**
 * POST /api/leads/:id/cold-calls
 * Creates a new cold call record for a specific lead
 * 
 * Example: POST /api/leads/5/cold-calls
 * Expected request body:
 * {
 *   "outcome": "connected",
 *   "notes": "Had a good conversation about their needs"
 * }
 * 
 * Flow: Sales rep makes a call → records outcome → controller validates → service inserts → return new cold call
 * 
 * Cold calls are outbound calls made to potential customers to introduce products or services.
 */
router.post('/:id/cold-calls', leadsController.addColdCall);

/**
 * POST /api/leads/:id/onsite-visits
 * Creates a new onsite visit record for a specific lead
 * 
 * Example: POST /api/leads/5/onsite-visits
 * Expected request body:
 * {
 *   "location": "123 Main St, City, State",
 *   "outcome": "meeting_done",
 *   "notes": "Discussed proposal details and pricing"
 * }
 * 
 * Flow: Sales rep visits lead location → records outcome → controller validates → service inserts → return new visit
 * 
 * Onsite visits are in-person meetings or visits to a lead's location.
 */
router.post('/:id/onsite-visits', leadsController.addOnsiteVisit);

/**
 * DELETE /api/leads/:id
 * Deletes a lead by ID
 * 
 * Example: DELETE /api/leads/5
 * Returns: { success: true, message: 'Lead deleted successfully' }
 * 
 * Flow: Client requests deletion → controller parses ID → service deletes lead → return success
 * 
 * NOTE: This route must come AFTER more specific routes like /:id/timeline
 */
router.delete('/:id', leadsController.deleteLead);

/**
 * GET /api/leads/:id
 * Retrieves a single lead by ID along with all its associated activities
 * 
 * Example: GET /api/leads/5
 * Returns: { success: true, data: { lead: {...}, activities: [...] } }
 * 
 * Flow: Client requests lead detail → controller parses ID → service fetches lead + activities → return JSON
 * 
 * NOTE: This route must come AFTER more specific routes like /:id/timeline
 */
router.get('/:id', leadsController.getLeadById);

// Export the router so it can be used in the main app (index.ts)
export default router;
