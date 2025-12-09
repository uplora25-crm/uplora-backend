/**
 * Leads Controller Module
 * 
 * This file handles HTTP requests and responses for the leads endpoints.
 * Controllers are responsible for:
 * - Receiving requests from routes
 * - Validating input data
 * - Calling service functions to perform business logic
 * - Sending appropriate HTTP responses
 * 
 * Controllers don't contain business logic - that's in the service layer.
 */

import { Request, Response } from 'express';
import {
  validateCreateLead,
  validateCreateActivity,
  validateCreateColdCall,
  validateCreateOnsiteVisit,
} from '../validators/leads.validator';
import * as leadsService from '../services/leads.service';

/**
 * Handles GET /api/leads - Retrieves all leads
 * 
 * @param req - Express request object (contains request data)
 * @param res - Express response object (used to send response back to client)
 */
export async function getAllLeads(req: Request, res: Response): Promise<void> {
  try {
    // Call the service to get all leads from the database
    const leads = await leadsService.getAllLeads();
    
    // Send a successful response (200 OK) with the leads data
    res.status(200).json({
      success: true,
      data: leads,
      count: leads.length,
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error fetching leads:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      } : undefined,
    });
  }
}

/**
 * Handles POST /api/leads - Creates a new lead
 * 
 * @param req - Express request object (req.body contains the JSON data sent by client)
 * @param res - Express response object
 */
export async function createLead(req: Request, res: Response): Promise<void> {
  try {
    // Step 1: Validate the request body using our Zod validator
    const validation = validateCreateLead(req.body);
    
    // If validation failed, send a 400 Bad Request response with error details
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors?.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    
    // Step 2: Validation passed, so we can use the validated data
    // The 'data' property is guaranteed to exist and be correctly typed
    const leadData = validation.data!;
    
    // Get the user email from the request header
    const userEmail = req.header('x-user-email') || (req as any).user?.email || null;
    
    // Step 3: Call the service to create the lead (and contact) in the database
    const newLead = await leadsService.createLead({
      ...leadData,
      created_by_email: userEmail,
    });
    
    // Step 4: Send a successful response (201 Created) with the new lead data
    res.status(201).json({
      success: true,
      data: newLead,
      message: 'Lead created successfully',
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error creating lead:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create lead',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      detail: process.env.NODE_ENV === 'development' ? error.detail : undefined,
    });
  }
}

/**
 * Handles GET /api/leads/:id - Retrieves a single lead with all its activities
 * 
 * Flow: Client requests lead detail → we parse ID from URL → service fetches lead + activities → return JSON
 * 
 * @param req - Express request object (req.params.id contains the lead ID from the URL)
 * @param res - Express response object
 */
export async function getLeadById(req: Request, res: Response): Promise<void> {
  try {
    // Step 1: Parse the lead ID from the URL parameter
    // Example: GET /api/leads/5 → req.params.id = "5"
    const leadId = parseInt(req.params.id, 10);
    
    // Validate that the ID is a valid number
    if (isNaN(leadId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid lead ID',
      });
      return;
    }
    
    // Step 2: Call the service to fetch the lead and its activities
    const leadDetail = await leadsService.getLeadById(leadId);
    
    // Step 3: Send a successful response (200 OK) with the lead detail
    res.status(200).json({
      success: true,
      data: leadDetail,
    });
  } catch (error: any) {
    // Check if this is a "not found" error (404)
    if (error.statusCode === 404) {
      res.status(404).json({
        success: false,
        message: error.message || 'Lead not found',
      });
      return;
    }
    
    // For any other error, send a 500 response
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles POST /api/leads/:id/activities - Creates a new activity for a lead
 * 
 * Flow: User submits activity form → we validate → service inserts activity → return new activity
 * 
 * @param req - Express request object (req.params.id = lead ID, req.body = activity data)
 * @param res - Express response object
 */
export async function addActivity(req: Request, res: Response): Promise<void> {
  try {
    // Step 1: Parse the lead ID from the URL parameter
    const leadId = parseInt(req.params.id, 10);
    
    // Validate that the ID is a valid number
    if (isNaN(leadId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid lead ID',
      });
      return;
    }
    
    // Step 2: Validate the request body using our Zod validator
    const validation = validateCreateActivity(req.body);
    
    // If validation failed, send a 400 Bad Request response with error details
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors?.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    
    // Step 3: Validation passed, so we can use the validated data
    const activityData = validation.data!;
    
    // Step 4: Call the service to create the activity in the database
    const newActivity = await leadsService.addActivity({
      leadId,
      activityType: activityData.activityType,
      description: activityData.description,
    });
    
    // Step 5: Send a successful response (201 Created) with the new activity data
    res.status(201).json({
      success: true,
      data: newActivity,
      message: 'Activity created successfully',
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles GET /api/leads/:id/timeline - Retrieves the complete timeline for a lead
 * 
 * This endpoint groups all timeline events for a lead into three categories:
 * - activities: General activities (notes, emails, etc.)
 * - coldCalls: Outbound calls made to the lead
 * - onsiteVisits: In-person visits to the lead's location
 * 
 * Flow: Client requests timeline → we parse ID → service fetches all three types → return grouped timeline
 * 
 * @param req - Express request object (req.params.id contains the lead ID from the URL)
 * @param res - Express response object
 */
export async function getLeadTimeline(req: Request, res: Response): Promise<void> {
  try {
    // Step 1: Parse the lead ID from the URL parameter
    const leadId = parseInt(req.params.id, 10);
    
    // Validate that the ID is a valid number
    if (isNaN(leadId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid lead ID',
      });
      return;
    }
    
    // Step 2: Call the service to fetch the timeline (activities, cold calls, onsite visits)
    const timeline = await leadsService.getLeadTimeline(leadId);
    
    // Step 3: Send a successful response (200 OK) with the timeline data
    res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error fetching lead timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead timeline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles POST /api/leads/:id/cold-calls - Creates a new cold call for a lead
 * 
 * Cold calls are outbound calls made to potential customers to introduce products or services.
 * This endpoint records the outcome of a cold call (e.g., 'connected', 'no_answer', 'wrong_number').
 * 
 * Flow: Sales rep makes a call → records outcome → we validate → service inserts → return new cold call
 * 
 * @param req - Express request object (req.params.id = lead ID, req.body = cold call data)
 * @param res - Express response object
 */
export async function addColdCall(req: Request, res: Response): Promise<void> {
  try {
    // Step 1: Parse the lead ID from the URL parameter
    const leadId = parseInt(req.params.id, 10);
    
    // Validate that the ID is a valid number
    if (isNaN(leadId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid lead ID',
      });
      return;
    }
    
    // Step 2: Validate the request body using our Zod validator
    const validation = validateCreateColdCall(req.body);
    
    // If validation failed, send a 400 Bad Request response with error details
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors?.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    
    // Step 3: Validation passed, so we can use the validated data
    const coldCallData = validation.data!;
    
    // Step 4: Call the service to create the cold call in the database
    const newColdCall = await leadsService.addColdCall({
      leadId,
      outcome: coldCallData.outcome,
      notes: coldCallData.notes,
    });
    
    // Step 5: Send a successful response (201 Created) with the new cold call data
    res.status(201).json({
      success: true,
      data: newColdCall,
      message: 'Cold call created successfully',
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error creating cold call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cold call',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles POST /api/leads/:id/onsite-visits - Creates a new onsite visit for a lead
 * 
 * Onsite visits are in-person meetings or visits to a lead's location.
 * This endpoint records the location, outcome (e.g., 'meeting_done', 'rescheduled', 'no_show'),
 * and any notes about the visit.
 * 
 * Flow: Sales rep visits lead location → records outcome → we validate → service inserts → return new visit
 * 
 * @param req - Express request object (req.params.id = lead ID, req.body = visit data)
 * @param res - Express response object
 */
export async function addOnsiteVisit(req: Request, res: Response): Promise<void> {
  try {
    // Step 1: Parse the lead ID from the URL parameter
    const leadId = parseInt(req.params.id, 10);
    
    // Validate that the ID is a valid number
    if (isNaN(leadId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid lead ID',
      });
      return;
    }
    
    // Step 2: Validate the request body using our Zod validator
    const validation = validateCreateOnsiteVisit(req.body);
    
    // If validation failed, send a 400 Bad Request response with error details
    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors?.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    
    // Step 3: Validation passed, so we can use the validated data
    const visitData = validation.data!;
    
    // Step 4: Call the service to create the onsite visit in the database
    const newVisit = await leadsService.addOnsiteVisit({
      leadId,
      location: visitData.location,
      outcome: visitData.outcome,
      notes: visitData.notes,
      in_time: visitData.in_time,
      out_time: visitData.out_time,
      rescheduled_date: visitData.rescheduled_date,
    });
    
    // Step 5: Send a successful response (201 Created) with the new visit data
    res.status(201).json({
      success: true,
      data: newVisit,
      message: 'Onsite visit created successfully',
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error creating onsite visit:', error);
    const errorMessage = error.message || 'Failed to create onsite visit';
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * Handles DELETE /api/leads/:id - Deletes a lead
 * 
 * @param req - Express request object
 * @param res - Express response object
 */
export async function deleteLead(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid lead ID',
      });
      return;
    }
    
    const deleted = await leadsService.deleteLead(id);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lead',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

