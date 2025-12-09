/**
 * Task Attachments Service Module
 * 
 * Handles file attachment operations for tasks.
 */

import pool from '../lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export interface TaskAttachment {
  id: number;
  task_id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskAttachmentInput {
  task_id: number;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  uploaded_by?: string;
}

/**
 * Creates a new task attachment record in the database
 */
export async function createTaskAttachment(data: CreateTaskAttachmentInput): Promise<TaskAttachment> {
  // Extract filename from file_path (multer already saved it with unique name)
  const filePath = data.file_path;
  const fileName = path.basename(filePath);
  
  const query = `
    INSERT INTO task_attachments (task_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    data.task_id,
    fileName,
    data.original_name,
    filePath,
    data.file_size,
    data.mime_type || null,
    data.uploaded_by || null,
  ]);
  
  return result.rows[0];
}

/**
 * Gets all attachments for a specific task
 */
export async function getAttachmentsByTaskId(taskId: number): Promise<TaskAttachment[]> {
  const query = `
    SELECT id, task_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, created_at, updated_at
    FROM task_attachments
    WHERE task_id = $1
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [taskId]);
  return result.rows;
}

/**
 * Gets a single attachment by ID
 */
export async function getAttachmentById(id: number): Promise<TaskAttachment | null> {
  const query = `
    SELECT id, task_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, created_at, updated_at
    FROM task_attachments
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Deletes a task attachment record and the physical file
 */
export async function deleteTaskAttachment(id: number): Promise<void> {
  // First, get the file path
  const attachment = await getAttachmentById(id);
  
  if (!attachment) {
    throw new Error('Attachment not found');
  }
  
  // Delete the database record
  const query = `
    DELETE FROM task_attachments
    WHERE id = $1
  `;
  
  await pool.query(query, [id]);
  
  // Delete the physical file
  try {
    await fs.unlink(attachment.file_path);
  } catch (error) {
    // Log error but don't fail if file doesn't exist
    console.error('Error deleting physical file:', error);
  }
}

