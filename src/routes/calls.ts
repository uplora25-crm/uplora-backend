/**
 * Calls Routes
 *
 * Routes for cold calls endpoints.
 */

import { Router } from 'express';
import {
  getAllCalls,
  getCallById,
  createCall,
  updateCall,
  deleteCall,
} from '../controllers/calls.controller';

const router = Router();

router.get('/', getAllCalls);
router.get('/:id', getCallById);
router.post('/', createCall);
router.patch('/:id', updateCall);
router.delete('/:id', deleteCall);

export default router;

