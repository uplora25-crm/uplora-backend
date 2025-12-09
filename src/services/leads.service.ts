/**
 * Leads Service Module
 * 
 * This file contains the business logic for working with leads.
 * It handles database operations like creating and retrieving leads.
 * 
 * The service layer separates database logic from HTTP request/response handling,
 * making the code easier to test and maintain.
 */

import pool, { getPoolClient } from '../lib/db';
import { PoolClient } from 'pg';
import type { LeadDetail, Activity, ColdCall, OnsiteVisit, LeadTimeline } from '../types/leads';

/**
 * Interface defining the structure of a Contact in the database
 */
export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: Date;
  updated_at?: Date | null;
}

/**
 * Interface defining the structure of a Lead in the database
 */
export interface Lead {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  contact_id: number | null;
  source: string | null;
  stage: string | null;
  status: string | null;
  verticals: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  created_by_email?: string | null;
  creator_name?: string | null;
}

/**
 * Interface for creating a new contact
 */
export interface CreateContactInput {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

/**
 * Interface for creating a new lead
 */
export interface CreateLeadInput {
  contact: CreateContactInput;
  source?: string;
  stage?: string;
  verticals?: string;
  created_by_email?: string;
}

/**
 * Interface for the complete lead response (lead with contact info)
 */
export interface LeadWithContact extends Lead {
  contact: Contact | null;
}

/**
 * Creates a new contact in the database
 * 
 * @param contactData - The contact information to create
 * @param client - Optional database client (for transactions). If not provided, uses the pool.
 * @returns The newly created contact
 */
async function createContact(
  contactData: CreateContactInput,
  client?: PoolClient
): Promise<Contact> {
  // SQL query to insert a new contact
  // $1, $2, $3, $4 are parameter placeholders (prevents SQL injection)
  const query = `
    INSERT INTO contacts (name, email, phone, company, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING *
  `;
  
  // Execute the query with the contact data
  // Use the provided client (for transactions) or the pool (for standalone operations)
  const result = client
    ? await client.query(query, [
        contactData.name,
        contactData.email || null,
        contactData.phone || null,
        contactData.company || null,
      ])
    : await pool.query(query, [
        contactData.name,
        contactData.email || null,
        contactData.phone || null,
        contactData.company || null,
      ]);
  
  // Return the first (and only) row from the result
  return result.rows[0];
}

/**
 * Creates a new lead in the database, linked to a contact
 * 
 * @param leadData - The lead information including contact data
 * @returns The newly created lead with its associated contact
 */
export async function createLead(leadData: CreateLeadInput): Promise<LeadWithContact> {
  // Start a database transaction
  // Transactions ensure that if any step fails, all changes are rolled back
  // Use getPoolClient() with timeout protection to prevent hanging
  const client = await getPoolClient(8000);
  
  try {
    // Begin the transaction
    await client.query('BEGIN');
    
    // Step 1: Create the contact first (using the transaction client)
    const contact = await createContact(leadData.contact, client);
    
    // Step 2: Create the lead, referencing the contact we just created
    const leadQuery = `
      INSERT INTO leads (name, email, phone, contact_id, source, stage, status, verticals, notes, created_by_email, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;
    
    const leadResult = await client.query(leadQuery, [
      contact.name,
      contact.email,
      contact.phone,
      contact.id, // Link the lead to the contact
      leadData.source || null,
      leadData.stage || 'new',
      'new', // Default status
      leadData.verticals || null,
      null, // notes placeholder
      leadData.created_by_email || null,
    ]);
    
    const lead = leadResult.rows[0];
    
    // Commit the transaction (save all changes)
    await client.query('COMMIT');
    
    // Return the lead with its contact information
    return {
      ...lead,
      contact: contact,
    };
  } catch (error: any) {
    // If anything goes wrong, rollback the transaction (undo all changes)
    await client.query('ROLLBACK');
    // Log detailed error information for debugging
    console.error('Error creating lead:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack,
    });
    throw error; // Re-throw the error so the controller can handle it
  } finally {
    // Always release the client back to the pool, even if there was an error
    client.release();
  }
}

/**
 * Retrieves all leads from the database with their associated contact information
 * 
 * @returns An array of all leads with their contacts
 */
export async function getAllLeads(): Promise<LeadWithContact[]> {
  // SQL query to get all leads and join with their contacts
  // LEFT JOIN means we'll get leads even if they don't have a contact (though they should)
  try {
    // Start with the simplest query - just leads without any joins
    // Then try to add joins incrementally
    let query = `
    SELECT 
      l.id,
      l.name,
      l.email,
      l.phone,
      l.contact_id,
      l.source,
      l.stage,
      l.status,
      l.verticals,
      l.notes,
      l.created_at,
      l.updated_at,
      l.created_by_email
    FROM leads l
    ORDER BY l.created_at DESC
    `;
    
    let result;
    let hasContactsJoin = false;
    let hasUsersJoin = false;
    
    // Try the basic query first
    try {
      result = await pool.query(query);
      console.log('✅ Basic leads query successful');
    } catch (basicError: any) {
      console.error('❌ Basic leads query failed:', {
        message: basicError.message,
        code: basicError.code,
        detail: basicError.detail,
      });
      throw basicError;
    }
    
    // Try to add contacts join
    try {
      query = `
      SELECT 
        l.id,
        l.name,
        l.email,
        l.phone,
        l.contact_id,
        l.source,
        l.stage,
        l.status,
        l.verticals,
        l.notes,
        l.created_at,
        l.updated_at,
        l.created_by_email,
        c.id as contact_table_id,
        c.name as contact_name,
        c.email as contact_email,
        c.phone as contact_phone,
        c.company as contact_company,
        c.created_at as contact_created_at,
        c.updated_at as contact_updated_at
      FROM leads l
      LEFT JOIN contacts c ON l.contact_id = c.id
      ORDER BY l.created_at DESC
      `;
      result = await pool.query(query);
      hasContactsJoin = true;
      console.log('✅ Leads query with contacts join successful');
    } catch (contactsError: any) {
      console.warn('⚠️ Contacts join failed, using basic query:', contactsError.message);
      // Continue with basic query result
    }
    
    // Try to add users join if contacts join worked
    if (hasContactsJoin) {
      try {
        query = `
        SELECT 
          l.id,
          l.name,
          l.email,
          l.phone,
          l.contact_id,
          l.source,
          l.stage,
          l.status,
          l.verticals,
          l.notes,
          l.created_at,
          l.updated_at,
          l.created_by_email,
          c.id as contact_table_id,
          c.name as contact_name,
          c.email as contact_email,
          c.phone as contact_phone,
          c.company as contact_company,
          c.created_at as contact_created_at,
          c.updated_at as contact_updated_at,
          u.name as creator_name
        FROM leads l
        LEFT JOIN contacts c ON l.contact_id = c.id
        LEFT JOIN users u ON l.created_by_email = u.email
        ORDER BY l.created_at DESC
        `;
        result = await pool.query(query);
        hasUsersJoin = true;
        console.log('✅ Leads query with users join successful');
      } catch (usersError: any) {
        console.warn('⚠️ Users join failed, continuing without creator_name:', usersError.message);
        // Continue with contacts join result
      }
    }
    
    // Helper function to convert dates to ISO strings
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      const dateStr = String(date);
      // If timestamp lacks timezone info, treat as UTC
      if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        return new Date(dateStr + 'Z').toISOString();
      }
      return new Date(dateStr).toISOString();
    };
    
    // Transform the flat result into nested objects (lead with contact)
    return result.rows.map((row): LeadWithContact => {
      // Safe date conversion helper - converts Date objects to ISO strings (for required fields)
      const safeDateToString = (date: any): string => {
        if (!date) return new Date().toISOString();
        if (date instanceof Date) return date.toISOString();
        try {
          return new Date(date).toISOString();
        } catch {
          return new Date().toISOString();
        }
      };
      
      // Safe date conversion helper for nullable fields - preserves null values
      const safeDateToStringOrNull = (date: any): string | null => {
        if (date === null || date === undefined) return null;
        if (date instanceof Date) return date.toISOString();
        try {
          return new Date(date).toISOString();
        } catch {
          return null;
        }
      };

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        contact_id: row.contact_id,
        source: row.source,
        stage: row.stage,
        status: row.status,
        verticals: row.verticals,
        notes: row.notes,
        created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
        updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
        created_by_email: row.created_by_email || null,
        creator_name: hasUsersJoin ? (row.creator_name || null) : null, // Will be null if users table doesn't exist or join fails
        contact: hasContactsJoin && row.contact_id
          ? {
              id: row.contact_table_id || row.contact_id,
              name: row.contact_name,
              email: row.contact_email,
              phone: row.contact_phone,
              company: row.contact_company,
              created_at: row.contact_created_at instanceof Date ? row.contact_created_at : new Date(row.contact_created_at),
              updated_at: row.contact_updated_at ? (row.contact_updated_at instanceof Date ? row.contact_updated_at : new Date(row.contact_updated_at)) : null,
            } as Contact
          : null,
      } as LeadWithContact;
    });
  } catch (error: any) {
    console.error('Error in getAllLeads service:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      stack: error.stack,
      name: error.name,
    });
    // Re-throw with more context
    const enhancedError = new Error(`Failed to fetch leads: ${error.message}`);
    (enhancedError as any).originalError = error;
    throw enhancedError;
  }
}

/**
 * Retrieves a single lead by ID along with all its associated activities
 * 
 * Flow: Controller calls this → we query lead + activities → return LeadDetail
 * 
 * @param leadId - The ID of the lead to retrieve
 * @returns The lead with its contact and all activities
 * @throws Error if the lead is not found
 */
export async function getLeadById(leadId: number): Promise<LeadDetail> {
  // Step 1: Fetch the lead with its contact information
  // This query joins leads with contacts, similar to getAllLeads but filters by ID
  const leadQuery = `
    SELECT 
      l.id,
      l.name,
      l.email,
      l.phone,
      l.contact_id,
      l.source,
      l.stage,
      l.status,
      l.verticals,
      l.notes,
      l.created_at::timestamptz as created_at,
      l.updated_at::timestamptz as updated_at,
      l.created_by_email,
      c.id as contact_table_id,
      c.name as contact_name,
      c.email as contact_email,
      c.phone as contact_phone,
      c.company as contact_company,
      c.created_at as contact_created_at,
      c.updated_at as contact_updated_at,
      u.name as creator_name
    FROM leads l
    LEFT JOIN contacts c ON l.contact_id = c.id
    LEFT JOIN users u ON l.created_by_email = u.email
    WHERE l.id = $1
  `;
  
  const leadResult = await pool.query(leadQuery, [leadId]);
  
  // If no lead found, throw an error that the controller can catch
  if (leadResult.rows.length === 0) {
    const notFoundError = new Error(`Lead with ID ${leadId} not found`);
    (notFoundError as any).statusCode = 404;
    throw notFoundError;
  }
  
  const leadRow = leadResult.rows[0];
  
  // Safe date conversion helper - converts Date objects to ISO strings (for required fields)
  const safeDateToString = (date: any): string => {
    if (!date) return new Date().toISOString();
    if (date instanceof Date) return date.toISOString();
    try {
      return new Date(date).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };
  
  // Safe date conversion helper for nullable fields - preserves null values
  const safeDateToStringOrNull = (date: any): string | null => {
    if (date === null || date === undefined) return null;
    if (date instanceof Date) return date.toISOString();
    try {
      return new Date(date).toISOString();
    } catch {
      return null;
    }
  };
  
  // Transform the lead data into the expected structure
  const lead = {
    id: leadRow.id,
    name: leadRow.name,
    email: leadRow.email,
    phone: leadRow.phone,
    contact_id: leadRow.contact_id,
    source: leadRow.source,
    stage: leadRow.stage,
    status: leadRow.status,
    verticals: leadRow.verticals,
    notes: leadRow.notes,
    created_at: safeDateToString(leadRow.created_at),
    updated_at: safeDateToString(leadRow.updated_at),
    created_by_email: leadRow.created_by_email || null,
    creator_name: leadRow.creator_name || null,
    contact: leadRow.contact_id
      ? {
          id: leadRow.contact_table_id || leadRow.contact_id,
          name: leadRow.contact_name,
          email: leadRow.contact_email,
          phone: leadRow.contact_phone,
          company: leadRow.contact_company,
          created_at: safeDateToString(leadRow.contact_created_at),
          updated_at: safeDateToStringOrNull(leadRow.contact_updated_at),
        }
      : null,
  };
  
  // Step 2: Fetch all activities for this lead, ordered by most recent first
  const activitiesQuery = `
    SELECT 
      id,
      lead_id,
      contact_id,
      activity_type,
      description,
      created_at
    FROM activities
    WHERE lead_id = $1
    ORDER BY created_at DESC
  `;
  
  const activitiesResult = await pool.query(activitiesQuery, [leadId]);
  
  // Transform activity rows into Activity objects
  const activities = activitiesResult.rows.map((row) => ({
    id: row.id,
    lead_id: row.lead_id,
    contact_id: row.contact_id,
    activity_type: row.activity_type,
    description: row.description,
    created_at: safeDateToString(row.created_at),
  }));
  
  // Return the complete lead detail with activities
  return {
    lead,
    activities,
  };
}

/**
 * Adds a new activity to a lead
 * 
 * Flow: User submits activity form → controller validates → this function inserts → returns new activity
 * 
 * @param params - Activity creation parameters
 * @param params.leadId - The ID of the lead this activity belongs to
 * @param params.activityType - Type of activity (e.g., 'call', 'email', 'meeting', 'note')
 * @param params.description - Optional description of the activity
 * @returns The newly created activity record
 */
export async function addActivity(params: {
  leadId: number;
  activityType: string;
  description?: string;
}): Promise<Activity> {
  // SQL query to insert a new activity
  // We set contact_id to NULL for now (can be enhanced later to link to a specific contact)
  // Use UTC time explicitly to ensure consistent timezone handling
  // Convert ISO string to UTC timestamp explicitly
  const nowUTC = new Date().toISOString();
  const query = `
    INSERT INTO activities (lead_id, contact_id, activity_type, description, created_at)
    VALUES ($1, $2, $3, $4, ($5::timestamptz AT TIME ZONE 'UTC')::timestamp)
    RETURNING *
  `;
  
  // Execute the query with the activity data
  const result = await pool.query(query, [
    params.leadId,
    null, // contact_id - can be enhanced later
    params.activityType,
    params.description || null,
    nowUTC, // UTC timestamp as ISO string
  ]);
  
  // Return the first (and only) row from the result
  const activityRow = result.rows[0];
  
  // Convert timestamp to UTC ISO string
  // PostgreSQL returns timestamp without timezone, which pg library interprets in connection timezone
  // We need to ensure it's treated as UTC
  const convertToUTC = (value: any): string => {
    if (!value) return '';
    if (value instanceof Date) {
      // If it's a Date object, it might be in local timezone
      // We need to get the UTC representation
      return value.toISOString();
    } else if (typeof value === 'string') {
      // If it's a string without timezone, treat as UTC
      const date = new Date(value);
      return date.toISOString();
    } else {
      return new Date(value).toISOString();
    }
  };
  
  return {
    id: activityRow.id,
    lead_id: activityRow.lead_id,
    contact_id: activityRow.contact_id,
    activity_type: activityRow.activity_type,
    description: activityRow.description,
    created_at: convertToUTC(activityRow.created_at),
  };
}

/**
 * Retrieves the complete timeline for a lead, including activities, cold calls, and onsite visits.
 * 
 * This function groups all timeline events for a lead into three categories:
 * - activities: General activities (notes, emails, etc.)
 * - coldCalls: Outbound calls made to the lead
 * - onsiteVisits: In-person visits to the lead's location
 * 
 * Flow: GET /api/leads/:id/timeline → controller calls this → we query all three tables → return grouped timeline
 * 
 * This allows the frontend to display a unified timeline showing all interactions with a lead,
 * whether they were general activities, cold calls, or onsite visits.
 * 
 * @param leadId - The ID of the lead to get the timeline for
 * @returns An object containing arrays of activities, cold calls, and onsite visits
 */
export async function getLeadTimeline(leadId: number): Promise<LeadTimeline> {
  // Step 1: Fetch all activities for this lead, ordered by most recent first
  // Explicitly convert timestamps to UTC timestamptz to ensure proper timezone handling
  const activitiesQuery = `
    SELECT 
      id,
      lead_id,
      contact_id,
      activity_type,
      description,
      (created_at AT TIME ZONE 'UTC')::timestamptz as created_at
    FROM activities
    WHERE lead_id = $1
    ORDER BY created_at DESC
  `;
  
  const activitiesResult = await pool.query(activitiesQuery, [leadId]);
  const activities: Activity[] = activitiesResult.rows.map((row) => {
    // Convert timestamp to UTC ISO string
    // PostgreSQL TIMESTAMP without timezone is stored in server timezone
    // We need to ensure it's treated as UTC when converting
    let created_at: string;
    if (row.created_at instanceof Date) {
      // If it's already a Date object, convert to UTC ISO string
      created_at = row.created_at.toISOString();
    } else if (typeof row.created_at === 'string') {
      // If it's a string, parse it and convert to UTC ISO
      // PostgreSQL returns timestamps in ISO format but may not have timezone
      const date = new Date(row.created_at);
      created_at = date.toISOString();
    } else {
      created_at = new Date(row.created_at).toISOString();
    }
    
    return {
      id: row.id,
      lead_id: row.lead_id,
      contact_id: row.contact_id,
      activity_type: row.activity_type,
      description: row.description,
      created_at,
    };
  });

  // Step 2: Fetch all cold calls for this lead, ordered by most recent first
  // Cold calls are outbound calls made to potential customers
  // Explicitly convert timestamps to UTC timestamptz to ensure proper timezone handling
  const coldCallsQuery = `
    SELECT 
      id,
      lead_id,
      (call_date AT TIME ZONE 'UTC')::timestamptz as call_date,
      duration,
      outcome,
      notes,
      (created_at AT TIME ZONE 'UTC')::timestamptz as created_at
    FROM cold_calls
    WHERE lead_id = $1
    ORDER BY created_at DESC
  `;
  
  const coldCallsResult = await pool.query(coldCallsQuery, [leadId]);
  const coldCalls: ColdCall[] = coldCallsResult.rows.map((row) => {
    // Convert timestamps to UTC ISO strings
    // Ensure proper timezone handling
    const convertToUTC = (value: any): string => {
      if (value instanceof Date) {
        return value.toISOString();
      } else if (typeof value === 'string') {
        const date = new Date(value);
        return date.toISOString();
      } else {
        return new Date(value).toISOString();
      }
    };
    
    return {
      id: row.id,
      lead_id: row.lead_id,
      call_date: convertToUTC(row.call_date),
      duration: row.duration,
      outcome: row.outcome,
      notes: row.notes,
      created_at: convertToUTC(row.created_at),
    };
  });

  // Step 3: Fetch all onsite visits for this lead, ordered by most recent first
  // Onsite visits are in-person meetings or visits to a lead's location
  // Explicitly convert timestamps to UTC timestamptz to ensure proper timezone handling
  // Try to fetch with new columns first, fallback to basic query if columns don't exist
  let onsiteVisitsQuery = `
    SELECT 
      id,
      lead_id,
      (visit_date AT TIME ZONE 'UTC')::timestamptz as visit_date,
      address,
      visit_type,
      status,
      notes,
      in_time,
      out_time,
      (created_at AT TIME ZONE 'UTC')::timestamptz as created_at,
      (updated_at AT TIME ZONE 'UTC')::timestamptz as updated_at
    FROM onsite_visits
    WHERE lead_id = $1
    ORDER BY created_at DESC
  `;
  
  let onsiteVisitsResult;
  try {
    onsiteVisitsResult = await pool.query(onsiteVisitsQuery, [leadId]);
  } catch (error: any) {
    // If the error is about missing columns, try the fallback query without new columns
    if (error.message && (
      error.message.includes('column') && error.message.includes('does not exist') ||
      error.message.includes('in_time') || error.message.includes('out_time')
    )) {
      console.warn('Columns in_time/out_time do not exist in database. Using fallback query. Please run migration 011_add_visit_times_to_onsite_visits.sql');
      onsiteVisitsQuery = `
        SELECT 
          id,
          lead_id,
          (visit_date AT TIME ZONE 'UTC')::timestamptz as visit_date,
          address,
          visit_type,
          status,
          notes,
          (created_at AT TIME ZONE 'UTC')::timestamptz as created_at,
          (updated_at AT TIME ZONE 'UTC')::timestamptz as updated_at
        FROM onsite_visits
        WHERE lead_id = $1
        ORDER BY created_at DESC
      `;
      onsiteVisitsResult = await pool.query(onsiteVisitsQuery, [leadId]);
    } else {
      // Re-throw the error if it's not about missing columns
      throw error;
    }
  }
  
  // Map database fields to API format: 'address' -> 'location', 'status' -> 'outcome'
  // Convert Date objects to ISO strings to ensure proper timezone handling
  const convertToUTC = (value: any): string | null => {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString();
    } else if (typeof value === 'string') {
      const date = new Date(value);
      return date.toISOString();
    } else {
      return new Date(value).toISOString();
    }
  };
  
  const onsiteVisits: OnsiteVisit[] = onsiteVisitsResult.rows.map((row) => ({
    id: row.id,
    lead_id: row.lead_id,
    visit_date: convertToUTC(row.visit_date) || new Date().toISOString(),
    location: row.address, // Map 'address' from DB to 'location' for API
    visit_type: row.visit_type,
    outcome: row.status || null, // Map 'status' from DB to 'outcome' for API (ensure it's not undefined)
    notes: row.notes,
    in_time: row.in_time ? String(row.in_time) : null,
    out_time: row.out_time ? String(row.out_time) : null,
    created_at: convertToUTC(row.created_at) || '',
    updated_at: convertToUTC(row.updated_at) || '',
  }));

  // Return all three types grouped together
  return {
    activities,
    coldCalls,
    onsiteVisits,
  };
}

/**
 * Adds a new cold call record for a lead
 * 
 * Cold calls are outbound calls made to potential customers to introduce products or services.
 * This function stores the outcome of a cold call (e.g., 'connected', 'no_answer', 'wrong_number')
 * and any notes about the call.
 * 
 * Flow: Sales rep makes a call → records outcome → controller validates → this function inserts → returns new cold call
 * 
 * @param params - Cold call creation parameters
 * @param params.leadId - The ID of the lead this cold call belongs to
 * @param params.outcome - The result of the call (e.g., 'connected', 'no_answer', 'wrong_number')
 * @param params.notes - Optional notes about the call
 * @returns The newly created cold call record
 */
export async function addColdCall(params: {
  leadId: number;
  outcome: string;
  notes?: string;
}): Promise<ColdCall> {
  // SQL query to insert a new cold call
  // Note: call_date is required by the database, so we use UTC time explicitly
  // This represents when the call was made (we assume it's being recorded immediately)
  // Convert ISO string to UTC timestamp explicitly
  const nowUTC = new Date().toISOString();
  const query = `
    INSERT INTO cold_calls (lead_id, call_date, outcome, notes, created_at)
    VALUES ($1, ($4::timestamptz AT TIME ZONE 'UTC')::timestamp, $2, $3, ($4::timestamptz AT TIME ZONE 'UTC')::timestamp)
    RETURNING *
  `;
  
  // Execute the query with the cold call data
  const result = await pool.query(query, [
    params.leadId,
    params.outcome,
    params.notes || null,
    nowUTC, // UTC timestamp as ISO string
  ]);
  
  // Return the first (and only) row from the result
  const coldCallRow = result.rows[0];
  
  // Convert Date objects to ISO strings (UTC) for proper timezone handling
  // PostgreSQL timestamp without timezone is stored as UTC but retrieved in connection timezone
  // We need to ensure proper UTC conversion
  const convertToUTC = (value: any): string => {
    if (!value) return '';
    if (value instanceof Date) {
      // Date object from pg library - ensure UTC conversion
      return value.toISOString();
    } else if (typeof value === 'string') {
      // String from database - parse and convert to UTC
      const date = new Date(value);
      return date.toISOString();
    } else {
      return new Date(value).toISOString();
    }
  };
  
  return {
    id: coldCallRow.id,
    lead_id: coldCallRow.lead_id,
    call_date: convertToUTC(coldCallRow.call_date),
    duration: coldCallRow.duration,
    outcome: coldCallRow.outcome,
    notes: coldCallRow.notes,
    created_at: convertToUTC(coldCallRow.created_at),
  };
}

/**
 * Adds a new onsite visit record for a lead
 * 
 * Onsite visits are in-person meetings or visits to a lead's location.
 * This function stores the location, outcome (e.g., 'meeting_done', 'rescheduled', 'no_show'),
 * and any notes about the visit.
 * 
 * Flow: Sales rep visits lead location → records outcome → controller validates → this function inserts → returns new visit
 * 
 * @param params - Onsite visit creation parameters
 * @param params.leadId - The ID of the lead this visit belongs to
 * @param params.location - The address or location of the visit
 * @param params.outcome - The result of the visit (e.g., 'meeting_done', 'rescheduled', 'no_show')
 * @param params.notes - Optional notes about the visit
 * @returns The newly created onsite visit record
 */
export async function addOnsiteVisit(params: {
  leadId: number;
  location: string;
  outcome: string;
  notes?: string;
  in_time?: string;
  out_time?: string;
  rescheduled_date?: string;
}): Promise<OnsiteVisit> {
  // SQL query to insert a new onsite visit
  // Note: The database uses 'address' (not 'location') and 'visit_date' is required
  // We use UTC time explicitly to ensure consistent timezone handling
  // The 'outcome' parameter maps to the 'status' column in the database
  // Convert ISO string to UTC timestamp explicitly
  // Try to use the full query with new columns first, fallback to basic if columns don't exist
  const nowUTC = new Date().toISOString();
  let query = `
    INSERT INTO onsite_visits (lead_id, visit_date, address, status, notes, in_time, out_time, rescheduled_date, created_at, updated_at)
    VALUES ($1, ($8::timestamptz AT TIME ZONE 'UTC')::timestamp, $2, $3, $4, $5, $6, $7, ($8::timestamptz AT TIME ZONE 'UTC')::timestamp, ($8::timestamptz AT TIME ZONE 'UTC')::timestamp)
    RETURNING *
  `;
  
  let values = [
    params.leadId,
    params.location, // Maps to 'address' column in database
    params.outcome, // Maps to 'status' column in database
    params.notes || null,
    params.in_time || null,
    params.out_time || null,
    params.rescheduled_date || null,
    nowUTC, // UTC timestamp for visit_date, created_at, and updated_at
  ];
  
  // Execute the query with the onsite visit data
  let result;
  try {
    result = await pool.query(query, values);
  } catch (error: any) {
    // If the error is about missing columns, try the fallback query without new columns
    if (error.message && (
      error.message.includes('column') && error.message.includes('does not exist') ||
      error.message.includes('in_time') || error.message.includes('out_time') || error.message.includes('rescheduled_date')
    )) {
      console.warn('New columns (in_time, out_time, rescheduled_date) do not exist in database. Using fallback query. Please run migration 011_add_visit_times_to_onsite_visits.sql');
      query = `
        INSERT INTO onsite_visits (lead_id, visit_date, address, status, notes, created_at, updated_at)
        VALUES ($1, ($5::timestamptz AT TIME ZONE 'UTC')::timestamp, $2, $3, $4, ($5::timestamptz AT TIME ZONE 'UTC')::timestamp, ($5::timestamptz AT TIME ZONE 'UTC')::timestamp)
        RETURNING *
      `;
      values = [
        params.leadId,
        params.location,
        params.outcome,
        params.notes || null,
        nowUTC, // UTC timestamp as ISO string
      ];
      values = [
        params.leadId,
        params.location,
        params.outcome,
        params.notes || null,
      ];
      result = await pool.query(query, values);
    } else {
      // Re-throw the error with more context
      console.error('Database error creating onsite visit:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  
  // Return the first (and only) row from the result
  const visitRow = result.rows[0];
  
  // Map database fields to API format: 'address' -> 'location', 'status' -> 'outcome'
  // Convert Date objects to ISO strings (UTC) for proper timezone handling
  // PostgreSQL timestamp without timezone is stored as UTC but retrieved in connection timezone
  const convertToUTC = (value: any): string | null => {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString();
    } else if (typeof value === 'string') {
      const date = new Date(value);
      return date.toISOString();
    } else {
      return new Date(value).toISOString();
    }
  };
  
  return {
    id: visitRow.id,
    lead_id: visitRow.lead_id,
    visit_date: convertToUTC(visitRow.visit_date) || new Date().toISOString(),
    location: visitRow.address, // Map 'address' from DB to 'location' for API
    visit_type: visitRow.visit_type,
    outcome: visitRow.status, // Map 'status' from DB to 'outcome' for API
    notes: visitRow.notes,
    in_time: visitRow.in_time ? String(visitRow.in_time) : null,
    out_time: visitRow.out_time ? String(visitRow.out_time) : null,
    created_at: convertToUTC(visitRow.created_at) || '',
    updated_at: convertToUTC(visitRow.updated_at) || '',
  };
}

/**
 * Deletes a lead by ID
 * Also deletes associated activities, cold calls, and onsite visits due to CASCADE
 * 
 * @param leadId - The ID of the lead to delete
 * @returns true if the lead was deleted, false if not found
 */
export async function deleteLead(leadId: number): Promise<boolean> {
  // Use getPoolClient() with timeout protection to prevent hanging
  const client = await getPoolClient(8000);
  
  try {
    await client.query('BEGIN');
    
    // Check if lead exists
    const checkQuery = 'SELECT id FROM leads WHERE id = $1';
    const checkResult = await client.query(checkQuery, [leadId]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    
    // Delete the lead (activities, cold_calls, onsite_visits will be deleted via CASCADE)
    const deleteQuery = 'DELETE FROM leads WHERE id = $1';
    const deleteResult = await client.query(deleteQuery, [leadId]);
    
    await client.query('COMMIT');
    
    return deleteResult.rowCount !== null && deleteResult.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
