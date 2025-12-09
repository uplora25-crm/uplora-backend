/**
 * Files Service Module
 * 
 * Handles file operations for client project files.
 */

import pool from '../lib/db';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface ProjectFile {
  id: number;
  client_id: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFileInput {
  client_id: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  uploaded_by?: string;
}

// Directory where files will be stored
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'client-files');

/**
 * Creates a new file record in the database
 */
export async function createFile(data: CreateFileInput): Promise<ProjectFile> {
  // Extract filename from file_path (multer already saved it with unique name)
  const filePath = data.file_path;
  const fileName = path.basename(filePath);
  
  const query = `
    INSERT INTO client_project_files (client_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    data.client_id,
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
 * Gets all files for a specific client
 */
export async function getFilesByClientId(clientId: string): Promise<ProjectFile[]> {
  const query = `
    SELECT id, client_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, created_at, updated_at
    FROM client_project_files
    WHERE client_id = $1
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [clientId]);
  return result.rows;
}

/**
 * Gets a single file by ID
 */
export async function getFileById(id: number): Promise<ProjectFile | null> {
  const query = `
    SELECT id, client_id, file_name, original_name, file_path, file_size, mime_type, uploaded_by, created_at, updated_at
    FROM client_project_files
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Deletes a file record and the physical file
 */
export async function deleteFile(id: number): Promise<void> {
  // First get the file record
  const file = await getFileById(id);
  
  if (!file) {
    throw new Error('File not found');
  }
  
  // Delete the physical file
  try {
    await fs.unlink(file.file_path);
  } catch (error: any) {
    // Log error but continue with database deletion
    console.error(`Failed to delete physical file: ${file.file_path}`, error);
  }
  
  // Delete the database record
  const query = `
    DELETE FROM client_project_files
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rowCount === 0) {
    throw new Error('File not found');
  }
}

/**
 * Gets the file path for serving/downloading
 */
export async function getFilePath(id: number): Promise<string | null> {
  const file = await getFileById(id);
  return file ? file.file_path : null;
}

