/**
 * Credentials Service Module
 * 
 * Handles database operations for project credentials with encryption/decryption.
 */

import pool from '../lib/db';
import { encryptPassword, decryptPassword } from '../lib/encryption';

export interface Credential {
  id: number;
  client_id: string; // TEXT in database (can be integer or UUID as string)
  title: string;
  url: string | null;
  username: string | null;
  encrypted_password: string;
  created_at: Date;
  updated_at: Date;
}

export interface CredentialWithDecrypted extends Omit<Credential, 'encrypted_password'> {
  password: string; // Decrypted password
}

export interface CreateCredentialInput {
  client_id: string | number; // Accepts string (will be converted to integer)
  title: string;
  url?: string;
  username?: string;
  password: string; // Plain text password - will be encrypted
}

export interface UpdateCredentialInput {
  title?: string;
  url?: string;
  username?: string;
  password?: string; // Plain text password - will be encrypted if provided
}

/**
 * Creates a new credential for a client
 */
export async function createCredential(data: CreateCredentialInput): Promise<Credential> {
  // Encrypt the password before storing
  const encryptedPassword = encryptPassword(data.password);
  
  // Convert client_id to string (database uses TEXT)
  const clientId = typeof data.client_id === 'string' ? data.client_id : String(data.client_id);
  
  const query = `
    INSERT INTO project_credentials (client_id, title, url, username, encrypted_password, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    clientId,
    data.title,
    data.url || null,
    data.username || null,
    encryptedPassword,
  ]);
  
  return result.rows[0];
}

/**
 * Gets all credentials for a specific client (with decrypted passwords)
 */
export async function getCredentialsByClientId(clientId: string | number): Promise<CredentialWithDecrypted[]> {
  // Convert client_id to string (database uses TEXT)
  const id = typeof clientId === 'string' ? clientId : String(clientId);
  
  const query = `
    SELECT id, client_id, title, url, username, encrypted_password, created_at, updated_at
    FROM project_credentials
    WHERE client_id = $1
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [id]);
  
  // Decrypt passwords before returning
  return result.rows.map((row: Credential) => ({
    id: row.id,
    client_id: row.client_id,
    title: row.title,
    url: row.url,
    username: row.username,
    password: decryptPassword(row.encrypted_password),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Gets a single credential by ID (with decrypted password)
 */
export async function getCredentialById(id: number): Promise<CredentialWithDecrypted | null> {
  const query = `
    SELECT id, client_id, title, url, username, encrypted_password, created_at, updated_at
    FROM project_credentials
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  
  // Decrypt password before returning
  return {
    id: row.id,
    client_id: row.client_id,
    title: row.title,
    url: row.url,
    username: row.username,
    password: decryptPassword(row.encrypted_password),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Updates a credential
 */
export async function updateCredential(
  id: number,
  data: UpdateCredentialInput
): Promise<Credential> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;
  
  if (data.title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(data.title);
  }
  
  if (data.url !== undefined) {
    updates.push(`url = $${paramCount++}`);
    values.push(data.url || null);
  }
  
  if (data.username !== undefined) {
    updates.push(`username = $${paramCount++}`);
    values.push(data.username || null);
  }
  
  if (data.password !== undefined) {
    // Encrypt the new password
    const encryptedPassword = encryptPassword(data.password);
    updates.push(`encrypted_password = $${paramCount++}`);
    values.push(encryptedPassword);
  }
  
  if (updates.length === 0) {
    throw new Error('No fields to update');
  }
  
  updates.push(`updated_at = NOW()`);
  values.push(id);
  
  const query = `
    UPDATE project_credentials
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error('Credential not found');
  }
  
  return result.rows[0];
}

/**
 * Deletes a credential
 */
export async function deleteCredential(id: number): Promise<void> {
  const query = `
    DELETE FROM project_credentials
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rowCount === 0) {
    throw new Error('Credential not found');
  }
}

