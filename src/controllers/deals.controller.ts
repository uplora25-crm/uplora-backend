/**
 * Deals Controller Module
 * 
 * This file handles HTTP requests and responses for the deals endpoints.
 * Controllers are responsible for:
 * - Receiving requests from routes
 * - Validating input data
 * - Calling service functions to perform business logic
 * - Sending appropriate HTTP responses
 * 
 * Controllers don't contain business logic - that's in the service layer.
 * 
 * A Deal is linked to a Lead via lead_id. This allows us to:
 * - Convert qualified leads into deals
 * - Track which lead a deal came from
 * - See the full context of a deal (contact info, activities, etc.)
 */

import { Request, Response } from 'express';
import {
  validateCreateDeal,
  validateMoveDealStage,
} from '../validators/deals.validator';
import * as dealsService from '../services/deals.service';

/**
 * Handles GET /api/deals/pipeline - Retrieves all deals grouped by stage
 * 
 * The sales pipeline groups deals into 5 stages:
 * - new: Just created, not yet qualified
 * - qualified: Deal has been qualified as a real opportunity
 * - proposal: Proposal has been sent to the customer
 * - negotiation: Deal is in negotiation phase
 * - closed: Deal has been closed (won or lost)
 * 
 * Flow: Client requests pipeline → controller calls service → service queries and groups deals → return grouped object
 * 
 * This endpoint is useful for displaying deals in a Kanban-style pipeline view.
 * 
 * @param req - Express request object (contains request data)
 * @param res - Express response object (used to send response back to client)
 */
export async function getDealsPipeline(req: Request, res: Response): Promise<void> {
  try {
    // Call the service to get all deals grouped by stage
    const dealsByStage = await dealsService.listDealsByStage();
    
    // Send a successful response (200 OK) with the grouped deals
    res.status(200).json({
      success: true,
      data: dealsByStage,
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error fetching deals pipeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process deal request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles POST /api/deals - Creates a new deal from an existing lead
 * 
 * A Deal is linked to a Lead via lead_id. This endpoint allows converting
 * a qualified lead into a deal for pipeline management.
 * 
 * Flow: User converts lead to deal → controller validates → service checks lead exists → service creates deal → return new deal
 * 
 * @param req - Express request object (contains request data)
 * @param res - Express response object (used to send response back to client)
 */
export async function createDeal(req: Request, res: Response): Promise<void> {
  try {
    // Validate the request body
    const validation = validateCreateDeal(req.body);
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

    const dealData = validation.data!;
    
    // Call the service to create the deal
    const newDeal = await dealsService.createDealFromLead({
      leadId: dealData.leadId,
      title: dealData.title,
      dealValue: dealData.dealValue,
      notes: dealData.notes,
    });
    
    // Send a successful response (201 Created) with the new deal
    res.status(201).json({
      success: true,
      data: newDeal,
      message: 'Deal created successfully',
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error creating deal:', error);
    
    // Check if it's a "lead not found" error (404)
    if (error.message.includes('does not exist')) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process deal request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles PATCH /api/deals/:id/stage - Moves a deal to a different stage
 * 
 * The sales pipeline has 5 stages: new → qualified → proposal → negotiation → closed
 * This endpoint allows moving a deal from one stage to another.
 * 
 * Flow: User moves deal in pipeline → controller validates stage → service updates deal → return updated deal
 * 
 * @param req - Express request object (contains request data and route parameters)
 * @param res - Express response object (used to send response back to client)
 */
export async function moveDealStage(req: Request, res: Response): Promise<void> {
  try {
    const dealId = req.params.id;
    
    if (!dealId) {
      res.status(400).json({ success: false, message: 'Deal ID is required' });
      return;
    }

    // Validate the request body
    const validation = validateMoveDealStage(req.body);
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

    const stageData = validation.data!;
    
    // Call the service to move the deal to the new stage
    const updatedDeal = await dealsService.moveDealToStage({
      dealId,
      stage: stageData.stage,
    });
    
    // Send a successful response (200 OK) with the updated deal
    res.status(200).json({
      success: true,
      data: updatedDeal,
      message: 'Deal stage updated successfully',
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error moving deal stage:', error);
    
    // Check if it's a "deal not found" or "invalid stage" error
    if (error.message.includes('does not exist') || error.message.includes('Invalid stage')) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process deal request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles DELETE /api/deals/:id - Deletes a deal
 * 
 * Flow: User deletes deal → controller validates → service deletes deal → return success
 * 
 * @param req - Express request object (contains request data and route parameters)
 * @param res - Express response object (used to send response back to client)
 */
export async function deleteDeal(req: Request, res: Response): Promise<void> {
  try {
    const dealId = req.params.id;
    
    if (!dealId) {
      res.status(400).json({ success: false, message: 'Deal ID is required' });
      return;
    }

    // Call the service to delete the deal
    const deleted = await dealsService.deleteDeal(dealId);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Deal not found',
      });
      return;
    }
    
    // Send a successful response (200 OK)
    res.status(200).json({
      success: true,
      message: 'Deal deleted successfully',
    });
  } catch (error: any) {
    // If something goes wrong, send an error response
    console.error('Error deleting deal:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to process deal request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

