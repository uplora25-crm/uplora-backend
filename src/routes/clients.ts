/**
 * Clients Routes
 *
 * Routes for clients (contacts) endpoints.
 */

import { Router } from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getDeletedClients,
  restoreClient,
  permanentDeleteClient,
} from '../controllers/clients.controller';

const router = Router();

// Specific routes must come before parameterized routes
router.get('/', getAllClients);
router.get('/trash', getDeletedClients);
router.post('/', createClient);

// Parameterized routes
router.get('/:id', getClientById);
router.patch('/:id', updateClient);
router.delete('/:id', deleteClient);
router.post('/:id/restore', restoreClient);
router.delete('/:id/permanent', permanentDeleteClient);

export default router;

