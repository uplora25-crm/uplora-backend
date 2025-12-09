/**
 * Type Definitions for Leads and Activities
 * 
 * This file defines TypeScript interfaces for lead-related data structures.
 * These types help ensure type safety throughout the application and make
 * it clear what data structures we're working with.
 */

/**
 * Activity represents a single activity record in the database.
 * Activities track interactions and events related to a lead (e.g., calls, emails, meetings).
 * 
 * Flow: User creates activity → stored in activities table → linked to lead via lead_id
 */
export interface Activity {
  id: number; // Auto-generated serial ID from database
  lead_id: number; // Foreign key to the leads table
  contact_id: string | null; // UUID reference to contacts (can be null)
  activity_type: string; // Type of activity (e.g., 'call', 'email', 'meeting', 'note')
  description: string | null; // Optional description of the activity
  created_at: string; // Timestamp when the activity was created (ISO string)
}

/**
 * LeadDetail represents a complete lead record with all its associated activities.
 * This is what we return when fetching a single lead by ID.
 * 
 * Flow: GET /api/leads/:id → service fetches lead + activities → returns LeadDetail
 */
export interface LeadDetail {
  lead: {
    id: number;
    contact_id: number | null;
    source: string | null;
    stage: string | null;
    status: string | null;
    notes: string | null;
    created_at: string; // ISO string
    updated_at: string; // ISO string
    contact: {
      id: number;
      name: string;
      email: string | null;
      phone: string | null;
      created_at: string; // ISO string
      updated_at: string | null; // ISO string
    } | null;
  };
  activities: Activity[]; // Array of all activities for this lead, ordered by created_at DESC
}

/**
 * ColdCall represents a cold call record in the database.
 * Cold calls are outbound calls made to potential customers (leads) to introduce
 * products or services. They are linked to a lead via lead_id.
 * 
 * Flow: Sales rep makes a call → records outcome → stored in cold_calls table → linked to lead
 */
export interface ColdCall {
  id: number; // Auto-generated serial ID from database
  lead_id: number; // Foreign key to the leads table
  call_date: string; // Date/time when the call was made (ISO string)
  duration: number | null; // Duration of the call in seconds (optional)
  outcome: string | null; // Result of the call (e.g., 'connected', 'no_answer', 'wrong_number')
  notes: string | null; // Optional notes about the call
  created_at: string; // Timestamp when the cold call was recorded (ISO string)
}

/**
 * OnsiteVisit represents an onsite visit record as returned by the API.
 * Onsite visits are in-person meetings or visits to a lead's location.
 * They are linked to a lead via lead_id.
 * 
 * Note: The database stores 'address' and 'status', but the API returns 'location' and 'outcome'
 * for better user-friendliness. The service layer handles this mapping.
 * 
 * Flow: Sales rep visits lead location → records outcome → stored in onsite_visits table → linked to lead
 */
export interface OnsiteVisit {
  id: number; // Auto-generated serial ID from database
  lead_id: number; // Foreign key to the leads table
  visit_date: string; // Date/time when the visit occurred (ISO string)
  location: string | null; // Address or location of the visit (mapped from 'address' in DB)
  visit_type: string | null; // Type of visit (e.g., 'initial', 'follow_up', 'demo')
  outcome: string | null; // Result of the visit (mapped from 'status' in DB, e.g., 'meeting_done', 'rescheduled', 'no_show')
  notes: string | null; // Optional notes about the visit
  in_time: string | null; // Time when the visit started (optional)
  out_time: string | null; // Time when the visit ended (optional)
  created_at: string; // Timestamp when the onsite visit was recorded (ISO string)
  updated_at: string; // Timestamp when the visit was last updated (ISO string)
}

/**
 * LeadTimeline represents all timeline events for a lead grouped by type.
 * This combines activities, cold calls, and onsite visits into a single response.
 * 
 * Flow: GET /api/leads/:id/timeline → service fetches all three types → returns grouped timeline
 * 
 * This allows the frontend to display a unified timeline showing all interactions
 * with a lead, whether they were general activities, cold calls, or onsite visits.
 */
export interface LeadTimeline {
  activities: Activity[]; // General activities (notes, emails, etc.)
  coldCalls: ColdCall[]; // All cold calls made to this lead
  onsiteVisits: OnsiteVisit[]; // All onsite visits for this lead
}

