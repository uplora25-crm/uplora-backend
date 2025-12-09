/**
 * Calls Service
 *
 * This service handles database operations for cold calls.
 */

import pool from '../lib/db';

export interface ColdCall {
  id: number;
  lead_id: number;
  call_date: string;
  duration: number | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  lead_name?: string;
  lead_email?: string;
  lead_company?: string;
}

function mapColdCallRow(row: any): ColdCall {
  return {
    id: row.id,
    lead_id: row.lead_id,
    call_date: new Date(row.call_date).toISOString(),
    duration: row.duration,
    outcome: row.outcome,
    notes: row.notes,
    created_at: new Date(row.created_at).toISOString(),
    lead_name: row.lead_name,
    lead_email: row.lead_email,
    lead_company: row.lead_company,
  };
}

/**
 * List all cold calls with lead information
 */
export async function getAllColdCalls(): Promise<ColdCall[]> {
  const query = `
    SELECT 
      cc.*,
      l.name as lead_name,
      l.email as lead_email,
      c.company as lead_company
    FROM cold_calls cc
    LEFT JOIN leads l ON cc.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    ORDER BY cc.call_date DESC, cc.created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows.map(mapColdCallRow);
}

/**
 * Get cold calls for a specific lead
 */
export async function getColdCallsForLead(leadId: number): Promise<ColdCall[]> {
  const query = `
    SELECT 
      cc.*,
      l.name as lead_name,
      l.email as lead_email,
      c.company as lead_company
    FROM cold_calls cc
    LEFT JOIN leads l ON cc.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    WHERE cc.lead_id = $1
    ORDER BY cc.call_date DESC, cc.created_at DESC
  `;

  const result = await pool.query(query, [leadId]);
  return result.rows.map(mapColdCallRow);
}

/**
 * Get a single cold call by ID
 */
export async function getColdCallById(id: number): Promise<ColdCall | null> {
  const query = `
    SELECT 
      cc.*,
      l.name as lead_name,
      l.email as lead_email,
      c.company as lead_company
    FROM cold_calls cc
    LEFT JOIN leads l ON cc.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    WHERE cc.id = $1
  `;

  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapColdCallRow(result.rows[0]);
}

/**
 * Create a new cold call
 */
export async function createColdCall(data: {
  lead_id: number;
  call_date: string;
  duration?: number;
  outcome?: string;
  notes?: string;
}): Promise<ColdCall> {
  const query = `
    INSERT INTO cold_calls (lead_id, call_date, duration, outcome, notes, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.lead_id,
    data.call_date,
    data.duration || null,
    data.outcome || null,
    data.notes || null,
  ]);

  const newCall = result.rows[0];
  const callWithLead = await getColdCallById(newCall.id);
  return callWithLead!;
}

/**
 * Update a cold call
 */
export async function updateColdCall(
  id: number,
  data: {
    call_date?: string;
    duration?: number;
    outcome?: string;
    notes?: string;
  }
): Promise<ColdCall | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.call_date !== undefined) {
    updates.push(`call_date = $${paramCount++}`);
    values.push(data.call_date);
  }
  if (data.duration !== undefined) {
    updates.push(`duration = $${paramCount++}`);
    values.push(data.duration);
  }
  if (data.outcome !== undefined) {
    updates.push(`outcome = $${paramCount++}`);
    values.push(data.outcome);
  }
  if (data.notes !== undefined) {
    updates.push(`notes = $${paramCount++}`);
    values.push(data.notes);
  }

  if (updates.length === 0) {
    return getColdCallById(id);
  }

  values.push(id);
  const query = `
    UPDATE cold_calls
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  await pool.query(query, values);
  return getColdCallById(id);
}

/**
 * Delete a cold call
 */
export async function deleteColdCall(id: number): Promise<boolean> {
  const query = `DELETE FROM cold_calls WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}

