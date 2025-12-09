/**
 * Files Controller Module
 * 
 * Handles HTTP requests and responses for file endpoints.
 */

import { Request, Response } from 'express';
import * as filesService from '../services/files.service';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'client-files');
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
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Accept all file types
    cb(null, true);
  },
});

/**
 * Handles GET /api/clients/:clientId/files - Gets all files for a client
 */
export async function getFilesByClient(req: Request, res: Response): Promise<void> {
  try {
    const { clientId } = req.params;
    
    if (!clientId) {
      res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
      return;
    }
    
    const files = await filesService.getFilesByClientId(clientId);
    
    res.status(200).json({
      success: true,
      data: files,
      count: files.length,
    });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles POST /api/clients/:clientId/files - Uploads a file for a client
 */
export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    const { clientId } = req.params;
    const file = req.file;
    
    if (!clientId) {
      res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
      return;
    }
    
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }
    
    // Get user email from request (if available)
    const uploadedBy = (req as any).user?.email || null;
    
    const projectFile = await filesService.createFile({
      client_id: clientId,
      original_name: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: uploadedBy,
    });
    
    res.status(201).json({
      success: true,
      data: projectFile,
      message: 'File uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles GET /api/files/:id/download - Downloads a file
 */
export async function downloadFile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'File ID is required',
      });
      return;
    }
    
    const fileId = parseInt(id, 10);
    if (isNaN(fileId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
      return;
    }
    
    const file = await filesService.getFileById(fileId);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }
    
    // Send file
    res.download(file.file_path, file.original_name, (err: Error | null) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to download file',
          });
        }
      }
    });
  } catch (error: any) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles DELETE /api/files/:id - Deletes a file
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'File ID is required',
      });
      return;
    }
    
    const fileId = parseInt(id, 10);
    if (isNaN(fileId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
      return;
    }
    
    await filesService.deleteFile(fileId);
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'File not found') {
      res.status(404).json({
        success: false,
        message: 'File not found',
      });
      return;
    }
    
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

