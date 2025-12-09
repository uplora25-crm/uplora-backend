/**
 * Deals Service Module
 * 
 * This file contains the business logic for working with deals.
 * It handles database operations like creating deals, listing deals by stage,
 * and moving deals through the sales pipeline.
 * 
 * The service layer separates database logic from HTTP request/response handling,
 * making the code easier to test and maintain.
 * 
 * A Deal is linked to a Lead via lead_id. This allows us to:
 * - Convert qualified leads into deals
 * - Track which lead a deal came from
 * - See the full context of a deal (contact info, activities, etc.)
 */

import pool from '../lib/db';
import type { Deal, DealsByStage } from '../types/deals';

/**
 * Valid pipeline stages that a deal can be in.
 * These stages represent the progression of a deal through the sales pipeline.
 */
const VALID_STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'closed'] as const;

/**
 * Retrieves all deals from the database and groups them by stage.
 * 
 * The sales pipeline groups deals into 5 stages:
 * - new: Just created, not yet qualified
 * - qualified: Deal has been qualified as a real opportunity
 * - proposal: Proposal has been sent to the customer
 * - negotiation: Deal is in negotiation phase
 * - closed: Deal has been closed (won or lost)
 * 
 * Flow: Controller calls this → we query all deals → group by stage in memory → return grouped object
 * 
 * This function ensures all 5 stage keys exist even if they have no deals,
 * making it easy to display an empty pipeline view.
 * 
 * @returns Promise that resolves with deals grouped by stage
 */
export async function listDealsByStage(): Promise<DealsByStage> {
  // Query all deals from the database with lead and contact information, ordered by created_at descending
  const query = `
    SELECT 
      d.id,
      d.lead_id,
      d.title,
      d.deal_value,
      d.stage,
      d.notes,
      d.created_at,
      d.updated_at,
      c.company as contact_company
    FROM deals d
    LEFT JOIN leads l ON d.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    ORDER BY d.created_at DESC
  `;
  
  const result = await pool.query(query);
  const allDeals: Deal[] = result.rows.map((row) => ({
    id: row.id,
    lead_id: row.lead_id,
    title: row.contact_company || row.title, // Use company name if available, otherwise use stored title
    deal_value: row.deal_value ? parseFloat(row.deal_value) : null,
    stage: row.stage,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }));

  // Initialize the grouped object with empty arrays for all stages
  // This ensures all 5 keys exist even if there are no deals in that stage
  const dealsByStage: DealsByStage = {
    new: [],
    qualified: [],
    proposal: [],
    negotiation: [],
    closed: [],
  };

  // Group deals by stage
  // We filter deals into their respective stage arrays
  allDeals.forEach((deal) => {
    const stage = deal.stage.toLowerCase();
    if (stage in dealsByStage) {
      dealsByStage[stage as keyof DealsByStage].push(deal);
    }
  });

  return dealsByStage;
}

/**
 * Creates a new deal from an existing lead.
 * 
 * A Deal is linked to a Lead via lead_id. This function:
 * 1. Verifies the lead exists
 * 2. Creates a new deal record linked to that lead
 * 3. Sets the deal stage to 'new' (starting point of the pipeline)
 * 
 * Flow: User converts lead to deal → controller validates → this function checks lead exists → inserts deal → returns new deal
 * 
 * @param params - Deal creation parameters
 * @param params.leadId - The ID of the lead to create a deal from
 * @param params.title - Title/name of the deal (defaults to 'Deal for Lead #<id>' if not provided)
 * @param params.dealValue - Optional monetary value of the deal
 * @param params.notes - Optional notes about the deal
 * @returns The newly created deal
 * @throws Error if the lead does not exist
 */
export async function createDealFromLead(params: {
  leadId: number;
  title?: string;
  dealValue?: number | null;
  notes?: string | null;
}): Promise<Deal> {
  // First, verify that the lead exists
  // This prevents creating deals for non-existent leads
  const leadCheckQuery = `
    SELECT id FROM leads WHERE id = $1
  `;
  const leadResult = await pool.query(leadCheckQuery, [params.leadId]);
  
  if (leadResult.rows.length === 0) {
    throw new Error(`Lead with id ${params.leadId} does not exist`);
  }

  // Get the lead's company name to use as default title
  const leadCompanyQuery = `
    SELECT c.company
    FROM leads l
    LEFT JOIN contacts c ON l.contact_id = c.id
    WHERE l.id = $1
  `;
  const leadCompanyResult = await pool.query(leadCompanyQuery, [params.leadId]);
  const companyName = leadCompanyResult.rows[0]?.company;
  
  // Generate a title if one wasn't provided
  // Use company name if available, otherwise fall back to lead ID
  const title = params.title || companyName || `Deal for Lead #${params.leadId}`;

  // Insert the new deal into the database
  // All deals start at the 'new' stage (first stage of the pipeline)
  const insertQuery = `
    INSERT INTO deals (lead_id, title, deal_value, stage, notes, created_at, updated_at)
    VALUES ($1, $2, $3, 'new', $4, NOW(), NOW())
    RETURNING *
  `;
  
  const result = await pool.query(insertQuery, [
    params.leadId,
    title,
    params.dealValue || null,
    params.notes || null,
  ]);

  const dealRow = result.rows[0];
  
  return {
    id: dealRow.id,
    lead_id: dealRow.lead_id,
    title: dealRow.title,
    deal_value: dealRow.deal_value ? parseFloat(dealRow.deal_value) : null,
    stage: dealRow.stage,
    notes: dealRow.notes,
    created_at: dealRow.created_at.toISOString(),
    updated_at: dealRow.updated_at.toISOString(),
  };
}

/**
 * Moves a deal to a different stage in the sales pipeline.
 * 
 * The sales pipeline has 5 stages: new → qualified → proposal → negotiation → closed
 * This function updates a deal's stage and sets updated_at to the current timestamp.
 * 
 * Flow: User moves deal in pipeline → controller validates stage → this function updates → returns updated deal
 * 
 * @param params - Stage update parameters
 * @param params.dealId - The UUID of the deal to update
 * @param params.stage - The new stage to move the deal to (must be one of the valid stages)
 * @returns The updated deal
 * @throws Error if the deal does not exist or if the stage is invalid
 */
export async function moveDealToStage(params: {
  dealId: string;
  stage: string;
}): Promise<Deal> {
  // Validate that the stage is one of the allowed values
  // This prevents invalid stages from being set
  const normalizedStage = params.stage.toLowerCase();
  if (!VALID_STAGES.includes(normalizedStage as any)) {
    throw new Error(
      `Invalid stage: ${params.stage}. Must be one of: ${VALID_STAGES.join(', ')}`
    );
  }

  // Update the deal's stage and set updated_at to the current timestamp
  const updateQuery = `
    UPDATE deals
    SET stage = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  
  const result = await pool.query(updateQuery, [normalizedStage, params.dealId]);
  
  if (result.rows.length === 0) {
    throw new Error(`Deal with id ${params.dealId} does not exist`);
  }

  const dealRow = result.rows[0];
  
  return {
    id: dealRow.id,
    lead_id: dealRow.lead_id,
    title: dealRow.title,
    deal_value: dealRow.deal_value ? parseFloat(dealRow.deal_value) : null,
    stage: dealRow.stage,
    notes: dealRow.notes,
    created_at: dealRow.created_at.toISOString(),
    updated_at: dealRow.updated_at.toISOString(),
  };
}

/**
 * Deletes a deal from the database.
 * 
 * Flow: User deletes deal → controller validates → this function deletes deal → returns success
 * 
 * @param dealId - The UUID of the deal to delete
 * @returns true if the deal was deleted, false if it didn't exist
 */
export async function deleteDeal(dealId: string): Promise<boolean> {
  const deleteQuery = `
    DELETE FROM deals
    WHERE id = $1
  `;
  
  const result = await pool.query(deleteQuery, [dealId]);
  
  return result.rowCount !== null && result.rowCount > 0;
}
