/**
 * Presentations Service Module
 * 
 * Handles database operations for presentations.
 */

import pool from '../lib/db';
import { Presentation, CreatePresentationParams, UpdatePresentationParams } from '../types/presentations';

/**
 * Maps a database row to a Presentation object
 */
function mapPresentationRow(row: any): Presentation {
  return {
    id: row.id,
    category: row.category,
    custom_label: row.custom_label,
    file_name: row.file_name,
    original_name: row.original_name,
    file_path: row.file_path,
    file_size: row.file_size,
    mime_type: row.mime_type,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Creates a new presentation record
 */
export async function createPresentation(data: CreatePresentationParams): Promise<Presentation> {
  const query = `
    INSERT INTO presentations (category, custom_label, file_name, original_name, file_path, file_size, mime_type, uploaded_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.category,
    data.custom_label || null,
    data.file_name,
    data.original_name,
    data.file_path,
    data.file_size,
    data.mime_type || null,
    data.uploaded_by || null,
  ]);

  return mapPresentationRow(result.rows[0]);
}

/**
 * Gets all presentations, optionally filtered by category
 */
export async function getPresentations(category?: string): Promise<Presentation[]> {
  let query = `
    SELECT *
    FROM presentations
  `;
  
  const params: any[] = [];
  
  if (category) {
    query += ` WHERE category = $1`;
    params.push(category);
  }
  
  query += ` ORDER BY category, created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows.map(mapPresentationRow);
}

/**
 * Gets all unique categories
 */
export async function getCategories(): Promise<string[]> {
  const query = `
    SELECT DISTINCT category
    FROM presentations
    ORDER BY category
  `;

  const result = await pool.query(query);
  return result.rows.map((row: any) => row.category);
}

/**
 * Gets a presentation by ID
 */
export async function getPresentationById(id: number): Promise<Presentation | null> {
  const query = `
    SELECT *
    FROM presentations
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }

  return mapPresentationRow(result.rows[0]);
}

/**
 * Updates a presentation
 */
export async function updatePresentation(id: number, data: UpdatePresentationParams): Promise<Presentation> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(data.category);
  }

  if (data.custom_label !== undefined) {
    updates.push(`custom_label = $${paramIndex++}`);
    values.push(data.custom_label);
  }

  if (updates.length === 0) {
    // No updates, just return the existing presentation
    const existing = await getPresentationById(id);
    if (!existing) {
      throw new Error('Presentation not found');
    }
    return existing;
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE presentations
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error('Presentation not found');
  }

  return mapPresentationRow(result.rows[0]);
}

/**
 * Deletes a presentation
 */
export async function deletePresentation(id: number): Promise<void> {
  const query = `
    DELETE FROM presentations
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  
  if (result.rowCount === 0) {
    throw new Error('Presentation not found');
  }
}

