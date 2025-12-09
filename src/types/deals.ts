/**
 * Type Definitions for Deals
 * 
 * This file defines TypeScript interfaces for deal-related data structures.
 * These types help ensure type safety throughout the application and make
 * it clear what data structures we're working with.
 * 
 * A Deal represents a sales opportunity that is linked to a Lead.
 * Deals move through different stages in the sales pipeline: new → qualified → proposal → negotiation → closed
 */

/**
 * Deal represents a single deal record in the database.
 * 
 * A Deal is linked to a Lead via lead_id. This relationship allows us to:
 * - Track which lead a deal came from
 * - See the full context of a deal (contact info, activities, etc.)
 * - Convert qualified leads into deals for pipeline management
 * 
 * Flow: Lead is qualified → Deal is created → Deal moves through pipeline stages → Deal is closed
 */
export type Deal = {
  id: string; // UUID primary key from database
  lead_id: number; // Foreign key to the leads table - links the deal to its originating lead
  title: string; // Title/name of the deal (e.g., "Enterprise License - Acme Corp")
  deal_value: number | null; // Monetary value of the deal (can be null if not yet determined)
  stage: string; // Current stage in the sales pipeline: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'closed'
  notes: string | null; // Optional notes about the deal
  created_at: string; // ISO timestamp when the deal was created
  updated_at: string; // ISO timestamp when the deal was last updated
};

/**
 * DealsByStage represents deals grouped by their pipeline stage.
 * 
 * The sales pipeline groups deals into 5 stages:
 * - new: Just created, not yet qualified
 * - qualified: Deal has been qualified as a real opportunity
 * - proposal: Proposal has been sent to the customer
 * - negotiation: Deal is in negotiation phase
 * - closed: Deal has been closed (won or lost)
 * 
 * Flow: GET /api/deals/pipeline → service queries all deals → groups by stage → returns grouped object
 * 
 * This structure makes it easy to display deals in a Kanban-style pipeline view.
 */
export type DealsByStage = {
  new: Deal[]; // Deals in the "new" stage
  qualified: Deal[]; // Deals in the "qualified" stage
  proposal: Deal[]; // Deals in the "proposal" stage
  negotiation: Deal[]; // Deals in the "negotiation" stage
  closed: Deal[]; // Deals in the "closed" stage
};

