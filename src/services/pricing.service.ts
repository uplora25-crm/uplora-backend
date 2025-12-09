/**
 * Pricing Service
 *
 * Handles database operations for subscription plans and pricing.
 */

import pool from '../lib/db';

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: string;
  features: string[] | null;
  is_active: boolean;
  is_custom: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanPayload {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billing_period?: string;
  features?: string[];
  is_active?: boolean;
  is_custom?: boolean;
  display_order?: number;
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  billing_period?: string;
  features?: string[];
  is_active?: boolean;
  display_order?: number;
}

function mapPlanRow(row: any): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    currency: row.currency || 'INR',
    billing_period: row.billing_period || 'monthly',
    features: row.features ? (Array.isArray(row.features) ? row.features : JSON.parse(row.features)) : null,
    is_active: row.is_active,
    is_custom: row.is_custom,
    display_order: row.display_order || 0,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Get all subscription plans
 */
export async function getAllPlans(): Promise<SubscriptionPlan[]> {
  const query = `
    SELECT *
    FROM subscription_plans
    ORDER BY display_order ASC, created_at ASC
  `;

  const result = await pool.query(query);
  return result.rows.map(mapPlanRow);
}

/**
 * Get active subscription plans only
 */
export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  const query = `
    SELECT *
    FROM subscription_plans
    WHERE is_active = true
    ORDER BY display_order ASC, created_at ASC
  `;

  const result = await pool.query(query);
  return result.rows.map(mapPlanRow);
}

/**
 * Get a plan by ID
 */
export async function getPlanById(id: number): Promise<SubscriptionPlan | null> {
  const query = `
    SELECT *
    FROM subscription_plans
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) {
    return null;
  }

  return mapPlanRow(result.rows[0]);
}

/**
 * Create a new subscription plan
 */
export async function createPlan(data: CreatePlanPayload): Promise<SubscriptionPlan> {
  const query = `
    INSERT INTO subscription_plans (
      name, description, price, currency, billing_period, 
      features, is_active, is_custom, display_order
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    data.name,
    data.description || null,
    data.price,
    data.currency || 'INR',
    data.billing_period || 'monthly',
    data.features ? JSON.stringify(data.features) : null,
    data.is_active !== undefined ? data.is_active : true,
    data.is_custom !== undefined ? data.is_custom : false,
    data.display_order || 0,
  ];

  const result = await pool.query(query, values);
  return mapPlanRow(result.rows[0]);
}

/**
 * Update a subscription plan
 */
export async function updatePlan(id: number, data: UpdatePlanPayload): Promise<SubscriptionPlan | null> {
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updateFields.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updateFields.push(`description = $${paramCount++}`);
    values.push(data.description || null);
  }
  if (data.price !== undefined) {
    updateFields.push(`price = $${paramCount++}`);
    values.push(data.price);
  }
  if (data.currency !== undefined) {
    updateFields.push(`currency = $${paramCount++}`);
    values.push(data.currency);
  }
  if (data.billing_period !== undefined) {
    updateFields.push(`billing_period = $${paramCount++}`);
    values.push(data.billing_period);
  }
  if (data.features !== undefined) {
    updateFields.push(`features = $${paramCount++}`);
    values.push(data.features ? JSON.stringify(data.features) : null);
  }
  if (data.is_active !== undefined) {
    updateFields.push(`is_active = $${paramCount++}`);
    values.push(data.is_active);
  }
  if (data.display_order !== undefined) {
    updateFields.push(`display_order = $${paramCount++}`);
    values.push(data.display_order);
  }

  if (updateFields.length === 0) {
    return getPlanById(id);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE subscription_plans
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    return null;
  }

  return mapPlanRow(result.rows[0]);
}

/**
 * Delete a subscription plan
 */
export async function deletePlan(id: number): Promise<boolean> {
  const query = `
    DELETE FROM subscription_plans
    WHERE id = $1
    RETURNING id
  `;

  const result = await pool.query(query, [id]);
  return result.rows.length > 0;
}

