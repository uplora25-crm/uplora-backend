/**
 * Credentials Routes
 *
 * Routes for project credentials endpoints.
 */

import { Router } from 'express';
import * as credentialsController from '../controllers/credentials.controller';

const router = Router();

// Get credentials for a client
router.get('/clients/:clientId/credentials', credentialsController.getCredentialsByClient);

// Create credential for a client
router.post('/clients/:clientId/credentials', credentialsController.createCredential);

// Get, update, delete a specific credential
router.get('/credentials/:id', credentialsController.getCredentialById);
router.patch('/credentials/:id', credentialsController.updateCredential);
router.delete('/credentials/:id', credentialsController.deleteCredential);

export default router;

