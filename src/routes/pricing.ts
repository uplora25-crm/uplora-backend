/**
 * Pricing Routes
 *
 * Routes for subscription plans and pricing endpoints.
 */

import { Router } from 'express';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} from '../controllers/pricing.controller';
import { setCacheHeaders, conditionalCache } from '../middleware/cache.middleware';

const router = Router();

// GET endpoints are cached (long cache - pricing plans rarely change)
// POST/PATCH/DELETE bypass cache
router.get('/', setCacheHeaders('long'), getPlans);
router.get('/:id', setCacheHeaders('long'), getPlan);
router.post('/', setCacheHeaders('none'), createPlan);
router.patch('/:id', setCacheHeaders('none'), updatePlan);
router.delete('/:id', setCacheHeaders('none'), deletePlan);

export default router;

