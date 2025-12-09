/**
 * Dashboard Service Module
 * 
 * This file contains the business logic for generating dashboard summary data.
 * It aggregates data from multiple tables (leads, cold_calls, onsite_visits, activities)
 * to provide a comprehensive overview of the CRM system.
 * 
 * The service layer separates database logic from HTTP request/response handling,
 * making the code easier to test and maintain.
 */

import pool from '../lib/db';

/**
 * Interface for the dashboard summary response.
 * This defines the shape of data returned by the dashboard summary endpoint.
 */
export interface DashboardSummary {
  totalLeads: number; // Total count of all leads in the system
  newLeadsThisWeek: number; // Count of leads created in the last 7 days
  leadsByStage: {
    new: number; // Leads in "new" stage
    qualified: number; // Leads in "qualified" stage
    proposal: number; // Leads in "proposal" stage
    negotiation: number; // Leads in "negotiation" stage
    closed: number; // Leads in "closed" stage
  };
  leadsByStatus: {
    new: number; // Leads with "new" status
    contacted: number; // Leads with "contacted" status
    won: number; // Leads with "won" status
    lost: number; // Leads with "lost" status
  };
  totalColdCalls: number; // Total count of all cold calls made
  totalOnsiteVisits: number; // Total count of all onsite visits
  recentActivities: Array<{
    lead_id: number; // ID of the lead this activity belongs to
    activity_type: string; // Type of activity (e.g., 'call', 'email', 'meeting', 'cold_call', 'onsite_visit')
    description: string | null; // Optional description of the activity
    created_at: string; // Timestamp when the activity was created
    source_type?: string; // Source of the activity: 'activity', 'cold_call', or 'onsite_visit'
    company_name?: string; // Company name from the lead's contact
  }>;
}

/**
 * Retrieves a comprehensive dashboard summary with aggregated statistics.
 * 
 * This function queries multiple tables to provide:
 * - Total leads count
 * - New leads from the past week
 * - Leads grouped by stage and status
 * - Total cold calls and onsite visits
 * - Recent activity feed
 * 
 * Flow: Controller calls this → we query multiple tables → return aggregated summary
 * 
 * @returns Promise that resolves with the dashboard summary data
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  // Query 1: Get total leads count
  // This counts all leads in the system, regardless of stage or status
  const totalLeadsQuery = `
    SELECT COUNT(*) as count
    FROM leads
  `;
  const totalLeadsResult = await pool.query(totalLeadsQuery);
  const totalLeads = parseInt(totalLeadsResult.rows[0].count, 10);

  // Query 2: Get new leads from the past 7 days
  // This helps track recent lead generation activity
  const newLeadsThisWeekQuery = `
    SELECT COUNT(*) as count
    FROM leads
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `;
  const newLeadsThisWeekResult = await pool.query(newLeadsThisWeekQuery);
  const newLeadsThisWeek = parseInt(newLeadsThisWeekResult.rows[0].count, 10);

  // Query 3: Get leads grouped by stage
  // This shows how many leads are in each stage of the sales pipeline
  const leadsByStageQuery = `
    SELECT stage, COUNT(*) as count
    FROM leads
    WHERE stage IS NOT NULL
    GROUP BY stage
  `;
  const leadsByStageResult = await pool.query(leadsByStageQuery);
  
  // Convert the grouped results into an object with default values of 0
  // This ensures all stages are present even if they have no leads
  const leadsByStage: DashboardSummary['leadsByStage'] = {
    new: 0,
    qualified: 0,
    proposal: 0,
    negotiation: 0,
    closed: 0,
  };
  
  leadsByStageResult.rows.forEach((row) => {
    const stage = row.stage?.toLowerCase();
    const count = parseInt(row.count, 10);
    if (stage && stage in leadsByStage) {
      leadsByStage[stage as keyof typeof leadsByStage] = count;
    }
  });

  // Query 4: Get leads grouped by status
  // This shows how many leads are in each status category
  const leadsByStatusQuery = `
    SELECT status, COUNT(*) as count
    FROM leads
    WHERE status IS NOT NULL
    GROUP BY status
  `;
  const leadsByStatusResult = await pool.query(leadsByStatusQuery);
  
  // Convert the grouped results into an object with default values of 0
  // This ensures all statuses are present even if they have no leads
  const leadsByStatus: DashboardSummary['leadsByStatus'] = {
    new: 0,
    contacted: 0,
    won: 0,
    lost: 0,
  };
  
  leadsByStatusResult.rows.forEach((row) => {
    const status = row.status?.toLowerCase();
    const count = parseInt(row.count, 10);
    if (status && status in leadsByStatus) {
      leadsByStatus[status as keyof typeof leadsByStatus] = count;
    }
  });

  // Query 5: Get total cold calls count
  // This shows the total number of cold calls made across all leads
  const totalColdCallsQuery = `
    SELECT COUNT(*) as count
    FROM cold_calls
  `;
  const totalColdCallsResult = await pool.query(totalColdCallsQuery);
  const totalColdCalls = parseInt(totalColdCallsResult.rows[0].count, 10);

  // Query 6: Get total onsite visits count
  // This shows the total number of onsite visits made across all leads
  const totalOnsiteVisitsQuery = `
    SELECT COUNT(*) as count
    FROM onsite_visits
  `;
  const totalOnsiteVisitsResult = await pool.query(totalOnsiteVisitsQuery);
  const totalOnsiteVisits = parseInt(totalOnsiteVisitsResult.rows[0].count, 10);

  // Query 7: Get recent activities from activities, cold_calls, and onsite_visits tables
  // This provides a comprehensive feed of recent activity across all leads
  // We'll combine all three types and sort by created_at to get the most recent 5 items
  
  // Get recent activities (notes, requirements, etc.)
  // Convert TIMESTAMP to TIMESTAMPTZ by treating it as UTC to ensure consistent timezone handling
  // For task activities, join with team_tasks to get assigned_to_email
  const recentActivitiesQuery = `
    SELECT 
      a.lead_id, 
      a.activity_type, 
      a.description, 
      (a.created_at AT TIME ZONE 'UTC')::timestamptz as created_at,
      'activity' as source_type,
      COALESCE(c.company, 'N/A') as company_name,
      CASE 
        WHEN a.activity_type = 'task' THEN tt.assigned_to_email
        ELSE NULL
      END as assigned_to_email
    FROM activities a
    LEFT JOIN leads l ON a.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    LEFT JOIN team_tasks tt ON a.activity_type = 'task' 
      AND a.lead_id = tt.lead_id 
      AND ABS(EXTRACT(EPOCH FROM (a.created_at - tt.created_at))) < 5
    ORDER BY a.created_at DESC
    LIMIT 25
  `;
  const recentActivitiesResult = await pool.query(recentActivitiesQuery);
  
  // Get recent cold calls
  // Convert TIMESTAMP to TIMESTAMPTZ by treating it as UTC to ensure consistent timezone handling
  const recentColdCallsQuery = `
    SELECT 
      cc.lead_id,
      'cold_call' as activity_type,
      CASE 
        WHEN cc.notes IS NOT NULL AND cc.notes != '' THEN 
          'Outcome: ' || cc.outcome || COALESCE(' - ' || cc.notes, '')
        ELSE 
          'Outcome: ' || cc.outcome
      END as description,
      (cc.created_at AT TIME ZONE 'UTC')::timestamptz as created_at,
      'cold_call' as source_type,
      COALESCE(c.company, 'N/A') as company_name
    FROM cold_calls cc
    LEFT JOIN leads l ON cc.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    ORDER BY cc.created_at DESC
    LIMIT 25
  `;
  const recentColdCallsResult = await pool.query(recentColdCallsQuery);
  
  // Get recent onsite visits
  // Convert TIMESTAMP to TIMESTAMPTZ by treating it as UTC to ensure consistent timezone handling
  const recentOnsiteVisitsQuery = `
    SELECT 
      ov.lead_id,
      'onsite_visit' as activity_type,
      CASE 
        WHEN ov.notes IS NOT NULL AND ov.notes != '' THEN 
          'Location: ' || COALESCE(ov.address, 'N/A') || ' - Outcome: ' || COALESCE(ov.status, 'N/A') || COALESCE(' - ' || ov.notes, '')
        ELSE 
          'Location: ' || COALESCE(ov.address, 'N/A') || ' - Outcome: ' || COALESCE(ov.status, 'N/A')
      END as description,
      (ov.created_at AT TIME ZONE 'UTC')::timestamptz as created_at,
      'onsite_visit' as source_type,
      COALESCE(c.company, 'N/A') as company_name
    FROM onsite_visits ov
    LEFT JOIN leads l ON ov.lead_id = l.id
    LEFT JOIN contacts c ON l.contact_id = c.id
    ORDER BY ov.created_at DESC
    LIMIT 25
  `;
  const recentOnsiteVisitsResult = await pool.query(recentOnsiteVisitsQuery);
  
  // Helper function to safely convert dates to ISO string
  // PostgreSQL TIMESTAMP columns are stored without timezone, so we need to treat them as UTC
  const toISOString = (date: any): string => {
    if (!date) return new Date().toISOString();
    
    // If it's already a Date object, use it directly
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // If it's a string, parse it
    if (typeof date === 'string') {
      // If the string doesn't have timezone info, treat it as UTC
      if (!date.includes('Z') && !date.includes('+') && !date.includes('-', 10)) {
        // Append 'Z' to indicate UTC
        return new Date(date + 'Z').toISOString();
      }
      return new Date(date).toISOString();
    }
    
    // For other types, try to convert
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return new Date().toISOString();
    }
    return dateObj.toISOString();
  };

  // Combine all activities, cold calls, and onsite visits
  const allRecentItems = [
    ...recentActivitiesResult.rows.map((row) => ({
      lead_id: row.lead_id,
      activity_type: row.activity_type,
      description: row.description,
      created_at: toISOString(row.created_at),
      source_type: row.source_type,
      company_name: row.company_name || 'N/A',
      assigned_to_email: row.assigned_to_email || null,
    })),
    ...recentColdCallsResult.rows.map((row) => ({
      lead_id: row.lead_id,
      activity_type: row.activity_type,
      description: row.description,
      created_at: toISOString(row.created_at),
      source_type: row.source_type,
      company_name: row.company_name || 'N/A',
    })),
    ...recentOnsiteVisitsResult.rows.map((row) => ({
      lead_id: row.lead_id,
      activity_type: row.activity_type,
      description: row.description,
      created_at: toISOString(row.created_at),
      source_type: row.source_type,
      company_name: row.company_name || 'N/A',
    })),
  ];
  
  // Sort by created_at (most recent first) and take the top 25
  const recentActivities = allRecentItems
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 25);

  // Return all the aggregated data as a single summary object
  return {
    totalLeads,
    newLeadsThisWeek,
    leadsByStage,
    leadsByStatus,
    totalColdCalls,
    totalOnsiteVisits,
    recentActivities,
  };
}

