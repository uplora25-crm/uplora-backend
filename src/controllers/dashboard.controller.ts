/**
 * Dashboard Controller Module
 * 
 * This file handles HTTP requests and responses for the dashboard endpoints.
 * Controllers are responsible for:
 * - Receiving requests from routes
 * - Calling service functions to perform business logic
 * - Sending appropriate HTTP responses
 * 
 * Controllers don't contain business logic - that's in the service layer.
 */

import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';

/**
 * Handles GET /api/dashboard/summary - Retrieves dashboard summary statistics
 * 
 * This endpoint provides a comprehensive overview of the CRM system including:
 * - Total leads and new leads this week
 * - Leads grouped by stage and status
 * - Total cold calls and onsite visits
 * - Recent activity feed
 * 
 * Flow: Client requests summary → controller calls service → service queries database → return summary
 * 
 * @param req - Express request object (contains request data)
 * @param res - Express response object (used to send response back to client)
 */
export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  try {
    // Call the service to get the dashboard summary from the database
    const summary = await dashboardService.getDashboardSummary();
    
    // Send a successful response (200 OK) with the summary data
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    // If something goes wrong, log the error and send an error response
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

