/**
 * Presentations Routes
 *
 * Routes for managing presentation files organized by category.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  getPresentations,
  getCategories,
  createPresentation,
  downloadPresentation,
  updatePresentation,
  deletePresentation,
  upload,
} from '../controllers/presentations.controller';

const router = Router();

// Get all presentations (optionally filtered by category)
router.get('/presentations', getPresentations);

// Get all categories
router.get('/presentations/categories', getCategories);

// Create a new presentation (file upload)
router.post('/presentations', (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
      });
    }
    next();
  });
}, createPresentation);

// Download a presentation file
router.get('/presentations/:id/download', downloadPresentation);

// Update a presentation (category/label only)
router.patch('/presentations/:id', updatePresentation);

// Delete a presentation
router.delete('/presentations/:id', deletePresentation);

export default router;

