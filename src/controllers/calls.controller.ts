/**
 * Calls Controller
 *
 * Handles HTTP requests for cold calls endpoints.
 */

import { Request, Response } from 'express';
import * as callsService from '../services/calls.service';

export async function getAllCalls(req: Request, res: Response): Promise<void> {
  try {
    const calls = await callsService.getAllColdCalls();
    res.status(200).json({
      success: true,
      data: calls,
      count: calls.length,
    });
  } catch (error: any) {
    console.error('Error fetching calls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calls',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getCallById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid call ID',
      });
      return;
    }

    const call = await callsService.getColdCallById(id);
    if (!call) {
      res.status(404).json({
        success: false,
        message: 'Call not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: call,
    });
  } catch (error: any) {
    console.error('Error fetching call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function createCall(req: Request, res: Response): Promise<void> {
  try {
    const { lead_id, call_date, duration, outcome, notes } = req.body;

    if (!lead_id || !call_date) {
      res.status(400).json({
        success: false,
        message: 'lead_id and call_date are required',
      });
      return;
    }

    const newCall = await callsService.createColdCall({
      lead_id: parseInt(lead_id),
      call_date,
      duration: duration ? parseInt(duration) : undefined,
      outcome,
      notes,
    });

    res.status(201).json({
      success: true,
      data: newCall,
    });
  } catch (error: any) {
    console.error('Error creating call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create call',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function updateCall(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid call ID',
      });
      return;
    }

    const { call_date, duration, outcome, notes } = req.body;
    const updatedCall = await callsService.updateColdCall(id, {
      call_date,
      duration: duration ? parseInt(duration) : undefined,
      outcome,
      notes,
    });

    if (!updatedCall) {
      res.status(404).json({
        success: false,
        message: 'Call not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedCall,
    });
  } catch (error: any) {
    console.error('Error updating call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update call',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function deleteCall(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid call ID',
      });
      return;
    }

    const deleted = await callsService.deleteColdCall(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Call not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Call deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete call',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

