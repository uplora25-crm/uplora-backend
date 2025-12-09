/**
 * Activities Routes
 *
 * Routes for activities endpoints.
 */

import { Router } from 'express';
import {
  getAllActivities,
  getActivitiesByType,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
} from '../controllers/activities.controller';

const router = Router();

router.get('/', getAllActivities);
router.get('/type/:type', getActivitiesByType);
router.get('/:id', getActivityById);
router.post('/', createActivity);
router.patch('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;

