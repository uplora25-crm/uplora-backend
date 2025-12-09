/**
 * Activities Service
 *
 * This service handles database operations for activities (meetings, emails, notes, calls).
 */

import pool from '../lib/db';

export interface Activity {
  id: number;
  lead_id: number | null;
  contact_id: number | null;
  activity_type: string;
  description: string | null;
  created_at: string;
  lead_name?: string;
  lead_email?: string;
  lead_company?: string;
  contact_name?: string;
  contact_email?: string;
  contact_company?: string;
}

function mapActivityRow(row: any): Activity {
  return {
    id: row.id,
    lead_id: row.lead_id,
    contact_id: row.contact_id,
    activity_type: row.activity_type,
    description: row.description,
    created_at: new Date(row.created_at).toISOString(),
    lead_name: row.lead_name,
    lead_email: row.lead_email,
    lead_company: row.lead_company,
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    contact_company: row.contact_company,
  };
}

/**
 * List all activities with lead/contact information
 */
export async function getAllActivities(): Promise<Activity[]> {
  const query = `
    SELECT 
      a.*,
      l.name as lead_name,
      l.email as lead_email,
      c1.company as lead_company,
      c2.name as contact_name,
      c2.email as contact_email,
      c2.company as contact_company
    FROM activities a
    LEFT JOIN leads l ON a.lead_id = l.id
    LEFT JOIN contacts c1 ON l.contact_id = c1.id
    LEFT JOIN contacts c2 ON a.contact_id = c2.id
    ORDER BY a.created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows.map(mapActivityRow);
}

/**
 * Get activities filtered by type
 */
export async function getActivitiesByType(activityType: string): Promise<Activity[]> {
  const query = `
    SELECT 
      a.*,
      l.name as lead_name,
      l.email as lead_email,
      c1.company as lead_company,
      c2.name as contact_name,
      c2.email as contact_email,
      c2.company as contact_company
    FROM activities a
    LEFT JOIN leads l ON a.lead_id = l.id
    LEFT JOIN contacts c1 ON l.contact_id = c1.id
    LEFT JOIN contacts c2 ON a.contact_id = c2.id
    WHERE a.activity_type = $1
    ORDER BY a.created_at DESC
  `;

  const result = await pool.query(query, [activityType]);
  return result.rows.map(mapActivityRow);
}

/**
 * Get activities for a specific lead
 */
export async function getActivitiesForLead(leadId: number): Promise<Activity[]> {
  const query = `
    SELECT 
      a.*,
      l.name as lead_name,
      l.email as lead_email,
      c1.company as lead_company,
      c2.name as contact_name,
      c2.email as contact_email,
      c2.company as contact_company
    FROM activities a
    LEFT JOIN leads l ON a.lead_id = l.id
    LEFT JOIN contacts c1 ON l.contact_id = c1.id
    LEFT JOIN contacts c2 ON a.contact_id = c2.id
    WHERE a.lead_id = $1
    ORDER BY a.created_at DESC
  `;

  const result = await pool.query(query, [leadId]);
  return result.rows.map(mapActivityRow);
}

/**
 * Get a single activity by ID
 */
export async function getActivityById(id: number): Promise<Activity | null> {
  const query = `
    SELECT 
      a.*,
      l.name as lead_name,
      l.email as lead_email,
      c1.company as lead_company,
      c2.name as contact_name,
      c2.email as contact_email,
      c2.company as contact_company
    FROM activities a
    LEFT JOIN leads l ON a.lead_id = l.id
    LEFT JOIN contacts c1 ON l.contact_id = c1.id
    LEFT JOIN contacts c2 ON a.contact_id = c2.id
    WHERE a.id = $1
  `;

  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapActivityRow(result.rows[0]);
}

/**
 * Create a new activity
 */
export async function createActivity(data: {
  lead_id?: number;
  contact_id?: number;
  activity_type: string;
  description?: string;
}): Promise<Activity> {
  const query = `
    INSERT INTO activities (lead_id, contact_id, activity_type, description, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.lead_id || null,
    data.contact_id || null,
    data.activity_type,
    data.description || null,
  ]);

  const newActivity = result.rows[0];
  const activityWithDetails = await getActivityById(newActivity.id);
  return activityWithDetails!;
}

/**
 * Update an activity
 */
export async function updateActivity(
  id: number,
  data: {
    activity_type?: string;
    description?: string;
  }
): Promise<Activity | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.activity_type !== undefined) {
    updates.push(`activity_type = $${paramCount++}`);
    values.push(data.activity_type);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(data.description);
  }

  if (updates.length === 0) {
    return getActivityById(id);
  }

  values.push(id);
  const query = `
    UPDATE activities
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  await pool.query(query, values);
  return getActivityById(id);
}

/**
 * Delete an activity
 */
export async function deleteActivity(id: number): Promise<boolean> {
  const query = `DELETE FROM activities WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}

