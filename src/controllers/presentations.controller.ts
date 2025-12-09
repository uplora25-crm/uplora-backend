/**
 * Presentations Controller Module
 * 
 * Handles HTTP requests and responses for presentation endpoints.
 */

import { Request, Response } from 'express';
import * as presentationsService from '../services/presentations.service';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'presentations');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for presentations
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Accept all file types for presentations
    cb(null, true);
  },
});

/**
 * Handles GET /api/presentations - Gets all presentations
 */
export async function getPresentations(req: Request, res: Response): Promise<void> {
  try {
    const category = req.query.category as string | undefined;
    const presentations = await presentationsService.getPresentations(category);
    
    res.json({
      success: true,
      data: presentations,
    });
  } catch (error: any) {
    console.error('Error fetching presentations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch presentations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles GET /api/presentations/categories - Gets all categories
 */
export async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await presentationsService.getCategories();
    
    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles POST /api/presentations - Creates a new presentation
 */
export async function createPresentation(req: Request, res: Response): Promise<void> {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { category, custom_label } = req.body;
    const file = req.file;

    if (!category || !category.trim()) {
      console.error('Category validation failed:', category);
      res.status(400).json({
        success: false,
        message: 'Category is required',
      });
      return;
    }

    if (!file) {
      console.error('File validation failed - no file in request');
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const uploadedBy = (req as any).user?.email || req.header('x-user-email') || null;
    console.log('Uploaded by:', uploadedBy);
    
    const presentation = await presentationsService.createPresentation({
      category: category.trim(),
      custom_label: custom_label?.trim() || null,
      file_name: file.filename,
      original_name: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: uploadedBy,
    });
    
    res.status(201).json({
      success: true,
      data: presentation,
      message: 'Presentation uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error creating presentation:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload presentation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles GET /api/presentations/:id/download - Downloads a presentation file
 */
export async function downloadPresentation(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid presentation ID',
      });
      return;
    }

    const presentation = await presentationsService.getPresentationById(id);
    
    if (!presentation) {
      res.status(404).json({
        success: false,
        message: 'Presentation not found',
      });
      return;
    }

    // Check if file exists
    try {
      await fs.access(presentation.file_path);
    } catch {
      res.status(404).json({
        success: false,
        message: 'File not found on server',
      });
      return;
    }

    // Determine if file should be displayed inline (for PDFs) or downloaded
    const isPDF = presentation.mime_type?.toLowerCase().includes('pdf') || 
                  presentation.original_name.toLowerCase().endsWith('.pdf');
    const disposition = isPDF ? 'inline' : 'attachment';
    
    // Set headers for file download/view
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(presentation.original_name)}"`);
    res.setHeader('Content-Type', presentation.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', presentation.file_size.toString());

    // Send file
    res.sendFile(path.resolve(presentation.file_path));
  } catch (error: any) {
    console.error('Error downloading presentation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download presentation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles PATCH /api/presentations/:id - Updates a presentation
 */
export async function updatePresentation(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid presentation ID',
      });
      return;
    }

    const { category, custom_label } = req.body;
    
    const presentation = await presentationsService.updatePresentation(id, {
      category: category?.trim(),
      custom_label: custom_label?.trim() || null,
    });
    
    res.json({
      success: true,
      data: presentation,
      message: 'Presentation updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating presentation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update presentation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles DELETE /api/presentations/:id - Deletes a presentation
 */
export async function deletePresentation(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid presentation ID',
      });
      return;
    }

    const presentation = await presentationsService.getPresentationById(id);
    
    if (!presentation) {
      res.status(404).json({
        success: false,
        message: 'Presentation not found',
      });
      return;
    }

    // Delete file from filesystem
    try {
      await fs.unlink(presentation.file_path);
    } catch (error) {
      console.error('Error deleting file from filesystem:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await presentationsService.deletePresentation(id);
    
    res.json({
      success: true,
      message: 'Presentation deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting presentation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete presentation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

