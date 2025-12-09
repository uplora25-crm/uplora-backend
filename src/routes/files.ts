/**
 * Files Routes
 *
 * Routes for client project files endpoints.
 */

import { Router } from 'express';
import * as filesController from '../controllers/files.controller';

const router = Router();

// Get files for a client
router.get('/clients/:clientId/files', filesController.getFilesByClient);

// Upload file for a client (uses multer middleware)
router.post('/clients/:clientId/files', filesController.upload.single('file'), filesController.uploadFile);

// Download a file
router.get('/files/:id/download', filesController.downloadFile);

// Delete a file
router.delete('/files/:id', filesController.deleteFile);

export default router;

