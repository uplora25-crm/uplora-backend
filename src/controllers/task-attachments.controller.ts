/**
 * Task Attachments Controller Module
 * 
 * Handles HTTP requests and responses for task attachment endpoints.
 */

import { Request, Response } from 'express';
import * as taskAttachmentsService from '../services/task-attachments.service';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'task-attachments');
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
 * Handles GET /api/tasks/:taskId/attachments - Gets all attachments for a task
 */
export async function getTaskAttachments(req: Request, res: Response): Promise<void> {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    
    if (isNaN(taskId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid task ID',
      });
      return;
    }
    
    const attachments = await taskAttachmentsService.getAttachmentsByTaskId(taskId);
    
    res.status(200).json({
      success: true,
      data: attachments,
      count: attachments.length,
    });
  } catch (error: any) {
    console.error('Error fetching task attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attachments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles POST /api/tasks/:taskId/attachments - Uploads an attachment for a task
 */
export async function uploadTaskAttachment(req: Request, res: Response): Promise<void> {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const file = req.file;
    
    if (isNaN(taskId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid task ID',
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
    const uploadedBy = (req as any).user?.email || req.header('x-user-email') || null;
    
    const attachment = await taskAttachmentsService.createTaskAttachment({
      task_id: taskId,
      original_name: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: uploadedBy,
    });
    
    res.status(201).json({
      success: true,
      data: attachment,
      message: 'File uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error uploading task attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload attachment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles GET /api/task-attachments/:id/download - Downloads an attachment
 */
export async function downloadAttachment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Attachment ID is required',
      });
      return;
    }
    
    const attachmentId = parseInt(id, 10);
    if (isNaN(attachmentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid attachment ID',
      });
      return;
    }
    
    const attachment = await taskAttachmentsService.getAttachmentById(attachmentId);
    
    if (!attachment) {
      res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
      return;
    }
    
    // Send file
    res.download(attachment.file_path, attachment.original_name, (err: Error | null) => {
      if (err) {
        console.error('Error downloading attachment:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to download attachment',
          });
        }
      }
    });
  } catch (error: any) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download attachment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles DELETE /api/task-attachments/:id - Deletes an attachment
 */
export async function deleteAttachment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Attachment ID is required',
      });
      return;
    }
    
    const attachmentId = parseInt(id, 10);
    if (isNaN(attachmentId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid attachment ID',
      });
      return;
    }
    
    await taskAttachmentsService.deleteTaskAttachment(attachmentId);
    
    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Attachment not found') {
      res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
      return;
    }
    
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attachment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

