/**
 * Clients Service
 *
 * This service handles database operations for clients (contacts).
 */

import pool from '../lib/db';

export interface Client {
  id: string; // UUID
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
  is_client?: boolean;
  client_number?: string | null;
  lead_id?: number | null; // ID of the lead this client was converted from
  lead_count?: number;
  deal_count?: number;
  deleted_at?: string | null;
}

function mapClientRow(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    is_client: row.is_client || false,
    client_number: row.client_number || null,
    lead_id: row.lead_id ? parseInt(row.lead_id) : null,
    lead_count: row.lead_count ? parseInt(row.lead_count) : 0,
    deal_count: row.deal_count ? parseInt(row.deal_count) : 0,
    deleted_at: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
  };
}

/**
 * List all clients with lead and deal counts
 * Only returns contacts where is_client = true AND deleted_at IS NULL
 * Only counts deals with stage = 'closed'
 */
export async function getAllClients(): Promise<Client[]> {
  const query = `
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.company,
      c.is_client,
      c.client_number,
      c.lead_id,
      c.created_at,
      c.updated_at,
      c.deleted_at,
      COUNT(DISTINCT l.id) as lead_count,
      COUNT(DISTINCT CASE WHEN d.stage = 'closed' THEN d.id END) as deal_count
    FROM contacts c
    LEFT JOIN leads l ON l.contact_id = c.id
    LEFT JOIN deals d ON d.lead_id = l.id
    WHERE c.is_client = true AND c.deleted_at IS NULL
    GROUP BY c.id, c.name, c.email, c.phone, c.company, c.is_client, c.client_number, c.lead_id, c.created_at, c.updated_at, c.deleted_at
    ORDER BY c.created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows.map(mapClientRow);
}

/**
 * Get a single client by ID
 * Only returns if is_client = true AND deleted_at IS NULL
 * Only counts deals with stage = 'closed'
 */
export async function getClientById(id: string): Promise<Client | null> {
  const query = `
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.company,
      c.is_client,
      c.client_number,
      c.lead_id,
      c.created_at,
      c.updated_at,
      c.deleted_at,
      COUNT(DISTINCT l.id) as lead_count,
      COUNT(DISTINCT CASE WHEN d.stage = 'closed' THEN d.id END) as deal_count
    FROM contacts c
    LEFT JOIN leads l ON l.contact_id = c.id
    LEFT JOIN deals d ON d.lead_id = l.id
    WHERE c.id = $1 AND c.is_client = true AND c.deleted_at IS NULL
    GROUP BY c.id, c.name, c.email, c.phone, c.company, c.is_client, c.client_number, c.lead_id, c.created_at, c.updated_at, c.deleted_at
  `;

  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapClientRow(result.rows[0]);
}

/**
 * Generate a unique client number
 * Format: CLT-000001, CLT-000002, etc.
 */
async function generateClientNumber(): Promise<string> {
  // Get the highest existing client number
  const query = `
    SELECT client_number
    FROM contacts
    WHERE client_number IS NOT NULL
      AND client_number LIKE 'CLT-%'
    ORDER BY client_number DESC
    LIMIT 1
  `;
  
  const result = await pool.query(query);
  
  if (result.rows.length === 0) {
    // First client
    return 'CLT-000001';
  }
  
  // Extract the number from the last client number (e.g., "CLT-000005" -> 5)
  const lastNumber = parseInt(result.rows[0].client_number.replace('CLT-', ''));
  const nextNumber = lastNumber + 1;
  
  // Format with leading zeros (6 digits)
  return `CLT-${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Create a new client
 * Sets is_client = true to mark it as a converted client
 * Generates a unique client number
 * Optionally stores the lead_id if the client was converted from a lead
 */
export async function createClient(data: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  lead_id?: number; // Optional: ID of the lead this client was converted from
}): Promise<Client> {
  // Generate unique client number
  const clientNumber = await generateClientNumber();
  
  const query = `
    INSERT INTO contacts (name, email, phone, company, is_client, client_number, lead_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, true, $5, $6, NOW(), NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.name,
    data.email || null,
    data.phone || null,
    data.company || null,
    clientNumber,
    data.lead_id || null,
  ]);

  const newClient = result.rows[0];
  const clientWithCounts = await getClientById(newClient.id);
  return clientWithCounts!;
}

/**
 * Update a client
 */
export async function updateClient(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  }
): Promise<Client | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramCount++}`);
    values.push(data.email);
  }
  if (data.phone !== undefined) {
    updates.push(`phone = $${paramCount++}`);
    values.push(data.phone);
  }
  if (data.company !== undefined) {
    updates.push(`company = $${paramCount++}`);
    values.push(data.company);
  }

  if (updates.length === 0) {
    return getClientById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);
  const query = `
    UPDATE contacts
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  await pool.query(query, values);
  return getClientById(id);
}

/**
 * Soft delete a client (move to trash)
 * Sets deleted_at timestamp instead of actually deleting
 * Only works if is_client = true and deleted_at IS NULL
 * Returns false if client not found or not a client
 */
export async function deleteClient(id: string): Promise<boolean> {
  // First verify it's actually a client and not already deleted
  const checkQuery = `SELECT id, is_client, deleted_at FROM contacts WHERE id = $1`;
  const checkResult = await pool.query(checkQuery, [id]);
  
  if (checkResult.rows.length === 0) {
    return false;
  }
  
  if (!checkResult.rows[0].is_client) {
    // Not a client, can't delete via this function
    return false;
  }
  
  if (checkResult.rows[0].deleted_at) {
    // Already deleted
    return false;
  }
  
  // Soft delete: Set deleted_at timestamp
  const updateQuery = `
    UPDATE contacts 
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND is_client = true AND deleted_at IS NULL
  `;
  const result = await pool.query(updateQuery, [id]);
  
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get all deleted clients (from trash)
 * Returns contacts where is_client = true AND deleted_at IS NOT NULL
 */
export async function getDeletedClients(): Promise<Client[]> {
  const query = `
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.company,
      c.is_client,
      c.client_number,
      c.lead_id,
      c.created_at,
      c.updated_at,
      c.deleted_at,
      COUNT(DISTINCT l.id) as lead_count,
      COUNT(DISTINCT CASE WHEN d.stage = 'closed' THEN d.id END) as deal_count
    FROM contacts c
    LEFT JOIN leads l ON l.contact_id = c.id
    LEFT JOIN deals d ON d.lead_id = l.id
    WHERE c.is_client = true AND c.deleted_at IS NOT NULL
    GROUP BY c.id, c.name, c.email, c.phone, c.company, c.is_client, c.client_number, c.lead_id, c.created_at, c.updated_at, c.deleted_at
    ORDER BY c.deleted_at DESC
  `;

  const result = await pool.query(query);
  return result.rows.map(mapClientRow);
}

/**
 * Restore a client from trash
 * Sets deleted_at = NULL to restore the client
 * Returns false if client not found or not deleted
 */
export async function restoreClient(id: string): Promise<boolean> {
  // Verify it's a deleted client
  const checkQuery = `SELECT id, is_client, deleted_at FROM contacts WHERE id = $1`;
  const checkResult = await pool.query(checkQuery, [id]);
  
  if (checkResult.rows.length === 0) {
    return false;
  }
  
  if (!checkResult.rows[0].is_client) {
    return false;
  }
  
  if (!checkResult.rows[0].deleted_at) {
    // Not deleted, nothing to restore
    return false;
  }
  
  // Restore: Set deleted_at = NULL
  const updateQuery = `
    UPDATE contacts 
    SET deleted_at = NULL, updated_at = NOW()
    WHERE id = $1 AND is_client = true AND deleted_at IS NOT NULL
  `;
  const result = await pool.query(updateQuery, [id]);
  
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Permanently delete a client from trash
 * This is a hard delete - the record will be removed from the database
 * Only works if deleted_at IS NOT NULL (client is in trash)
 * Returns false if client not found or not in trash
 */
export async function permanentDeleteClient(id: string): Promise<boolean> {
  // Verify it's a deleted client
  const checkQuery = `SELECT id, is_client, deleted_at FROM contacts WHERE id = $1`;
  const checkResult = await pool.query(checkQuery, [id]);
  
  if (checkResult.rows.length === 0) {
    return false;
  }
  
  if (!checkResult.rows[0].is_client) {
    return false;
  }
  
  if (!checkResult.rows[0].deleted_at) {
    // Not in trash, can't permanently delete
    return false;
  }
  
  // Hard delete: Actually remove the record
  // Note: This will fail if there are foreign key constraints
  // In that case, we might want to handle it differently
  const deleteQuery = `DELETE FROM contacts WHERE id = $1 AND is_client = true AND deleted_at IS NOT NULL`;
  const result = await pool.query(deleteQuery, [id]);
  
  return result.rowCount !== null && result.rowCount > 0;
}

