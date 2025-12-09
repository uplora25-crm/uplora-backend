/**
 * Onsite Visits Service
 *
 * This service handles database operations for onsite visits.
 */

import pool from '../lib/db';

export interface OnsiteVisit {
  id: number;
  lead_id: number;
  visit_date: string;
  address: string | null;
  visit_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  lead_name?: string;
  lead_email?: string;
  lead_company?: string;
}

function mapVisitRow(row: any): OnsiteVisit {
  return {
    id: row.id,
    lead_id: row.lead_id,
    visit_date: new Date(row.visit_date).toISOString(),
    address: row.address,
    visit_type: row.visit_type,
    status: row.status,
    notes: row.notes,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    lead_name: row.lead_name,
    lead_email: row.lead_email,
    lead_company: row.lead_company,
  };
}

/**
 * List all onsite visits with lead information
 */
export async function getAllVisits(): Promise<OnsiteVisit[]> {
  const query = `
    SELECT 
      ov.*,
      l.name as lead_name,
      l.email as lead_email,
      c.company as lead_company
    FROM onsite_visits ov
    LEFT JOIN leads l ON ov.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    ORDER BY ov.visit_date DESC, ov.created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows.map(mapVisitRow);
}

/**
 * Get visits for a specific lead
 */
export async function getVisitsForLead(leadId: number): Promise<OnsiteVisit[]> {
  const query = `
    SELECT 
      ov.*,
      l.name as lead_name,
      l.email as lead_email,
      c.company as lead_company
    FROM onsite_visits ov
    LEFT JOIN leads l ON ov.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    WHERE ov.lead_id = $1
    ORDER BY ov.visit_date DESC, ov.created_at DESC
  `;

  const result = await pool.query(query, [leadId]);
  return result.rows.map(mapVisitRow);
}

/**
 * Get a single visit by ID
 */
export async function getVisitById(id: number): Promise<OnsiteVisit | null> {
  const query = `
    SELECT 
      ov.*,
      l.name as lead_name,
      l.email as lead_email,
      c.company as lead_company
    FROM onsite_visits ov
    LEFT JOIN leads l ON ov.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    WHERE ov.id = $1
  `;

  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapVisitRow(result.rows[0]);
}

/**
 * Create a new onsite visit
 */
export async function createVisit(data: {
  lead_id: number;
  visit_date: string;
  address?: string;
  visit_type?: string;
  status?: string;
  notes?: string;
}): Promise<OnsiteVisit> {
  const query = `
    INSERT INTO onsite_visits (lead_id, visit_date, address, visit_type, status, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.lead_id,
    data.visit_date,
    data.address || null,
    data.visit_type || null,
    data.status || 'scheduled',
    data.notes || null,
  ]);

  const newVisit = result.rows[0];
  const visitWithLead = await getVisitById(newVisit.id);
  return visitWithLead!;
}

/**
 * Update an onsite visit
 */
export async function updateVisit(
  id: number,
  data: {
    visit_date?: string;
    address?: string;
    visit_type?: string;
    status?: string;
    notes?: string;
    in_time?: string;
    out_time?: string;
  }
): Promise<OnsiteVisit | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.visit_date !== undefined) {
    updates.push(`visit_date = $${paramCount++}`);
    values.push(data.visit_date);
  }
  if (data.address !== undefined) {
    updates.push(`address = $${paramCount++}`);
    values.push(data.address);
  }
  if (data.visit_type !== undefined) {
    updates.push(`visit_type = $${paramCount++}`);
    values.push(data.visit_type);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(data.status);
  }
  if (data.notes !== undefined) {
    updates.push(`notes = $${paramCount++}`);
    values.push(data.notes);
  }
  if (data.in_time !== undefined) {
    updates.push(`in_time = $${paramCount++}`);
    values.push(data.in_time);
  }
  if (data.out_time !== undefined) {
    updates.push(`out_time = $${paramCount++}`);
    values.push(data.out_time);
  }

  if (updates.length === 0) {
    return getVisitById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);
  const query = `
    UPDATE onsite_visits
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  await pool.query(query, values);
  return getVisitById(id);
}

/**
 * Delete an onsite visit
 */
export async function deleteVisit(id: number): Promise<boolean> {
  const query = `DELETE FROM onsite_visits WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}

