/**
 * Visits Routes
 *
 * Routes for onsite visits endpoints.
 */

import { Router } from 'express';
import {
  getAllVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
} from '../controllers/visits.controller';

const router = Router();

router.get('/', getAllVisits);
router.get('/:id', getVisitById);
router.post('/', createVisit);
router.patch('/:id', updateVisit);
router.delete('/:id', deleteVisit);

export default router;

