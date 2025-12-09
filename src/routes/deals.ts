/**
 * Deals Routes Module
 * 
 * This file defines the HTTP routes (endpoints) for the deals API.
 * Routes map URLs to controller functions that handle the requests.
 * 
 * Example:
 *   GET /api/deals/pipeline → calls getDealsPipeline controller
 *   POST /api/deals → calls createDeal controller
 *   PATCH /api/deals/:id/stage → calls moveDealStage controller
 * 
 * IMPORTANT: More specific routes must come BEFORE parameterized routes.
 * Otherwise Express will match /api/deals/pipeline as /api/deals/:id with id="pipeline"
 */

import { Router } from 'express';
import * as dealsController from '../controllers/deals.controller';
import { setCacheHeaders } from '../middleware/cache.middleware';

// Create a new router instance
// A router is like a mini-app that handles a group of related routes
const router = Router();

/**
 * GET /api/deals/pipeline
 * Retrieves all deals grouped by their pipeline stage
 * 
 * Example: GET /api/deals/pipeline
 * Returns: { success: true, data: { new: Deal[], qualified: Deal[], proposal: Deal[], negotiation: Deal[], closed: Deal[] } }
 * 
 * Flow: Client requests pipeline → controller calls service → service queries and groups deals → return grouped object
 * 
 * The sales pipeline groups deals into 5 stages:
 * - new: Just created, not yet qualified
 * - qualified: Deal has been qualified as a real opportunity
 * - proposal: Proposal has been sent to the customer
 * - negotiation: Deal is in negotiation phase
 * - closed: Deal has been closed (won or lost)
 * 
 * This endpoint is useful for displaying deals in a Kanban-style pipeline view.
 * 
 * Cached for 60s (medium cache) - pipeline data changes moderately
 * 
 * NOTE: This route must come BEFORE the parameterized route /:id/stage
 */
router.get('/pipeline', setCacheHeaders('medium'), dealsController.getDealsPipeline);

/**
 * POST /api/deals
 * Creates a new deal from an existing lead
 * 
 * Example: POST /api/deals
 * Expected request body:
 * {
 *   "leadId": 5,
 *   "title": "Enterprise License - Acme Corp",
 *   "dealValue": 50000,
 *   "notes": "High priority deal"
 * }
 * 
 * Flow: User converts lead to deal → controller validates → service checks lead exists → service creates deal → return new deal
 * 
 * A Deal is linked to a Lead via lead_id. This allows converting qualified leads into deals
 * for pipeline management.
 */
router.post('/', dealsController.createDeal);

/**
 * PATCH /api/deals/:id/stage
 * Moves a deal to a different stage in the sales pipeline
 * 
 * Example: PATCH /api/deals/123e4567-e89b-12d3-a456-426614174000/stage
 * Expected request body:
 * {
 *   "stage": "qualified"
 * }
 * 
 * Flow: User moves deal in pipeline → controller validates stage → service updates deal → return updated deal
 * 
 * The sales pipeline has 5 stages: new → qualified → proposal → negotiation → closed
 * This endpoint allows moving a deal from one stage to another.
 */
router.patch('/:id/stage', dealsController.moveDealStage);

/**
 * DELETE /api/deals/:id
 * Deletes a deal from the database
 * 
 * Example: DELETE /api/deals/123e4567-e89b-12d3-a456-426614174000
 * 
 * Flow: User deletes deal → controller validates → service deletes deal → return success
 */
router.delete('/:id', dealsController.deleteDeal);

// Export the router so it can be used in the main app (index.ts)
export default router;

