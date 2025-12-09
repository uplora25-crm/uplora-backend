/**
 * Visits Controller
 *
 * Handles HTTP requests for onsite visits endpoints.
 */

import { Request, Response } from 'express';
import * as visitsService from '../services/visits.service';

export async function getAllVisits(req: Request, res: Response): Promise<void> {
  try {
    const visits = await visitsService.getAllVisits();
    res.status(200).json({
      success: true,
      data: visits,
      count: visits.length,
    });
  } catch (error: any) {
    console.error('Error fetching visits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getVisitById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid visit ID',
      });
      return;
    }

    const visit = await visitsService.getVisitById(id);
    if (!visit) {
      res.status(404).json({
        success: false,
        message: 'Visit not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: visit,
    });
  } catch (error: any) {
    console.error('Error fetching visit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function createVisit(req: Request, res: Response): Promise<void> {
  try {
    const { lead_id, visit_date, address, visit_type, status, notes } = req.body;

    if (!lead_id || !visit_date) {
      res.status(400).json({
        success: false,
        message: 'lead_id and visit_date are required',
      });
      return;
    }

    const newVisit = await visitsService.createVisit({
      lead_id: parseInt(lead_id),
      visit_date,
      address,
      visit_type,
      status,
      notes,
    });

    res.status(201).json({
      success: true,
      data: newVisit,
    });
  } catch (error: any) {
    console.error('Error creating visit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function updateVisit(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid visit ID',
      });
      return;
    }

    const { visit_date, address, visit_type, status, notes, in_time, out_time } = req.body;
    const updatedVisit = await visitsService.updateVisit(id, {
      visit_date,
      address,
      visit_type,
      status,
      notes,
      in_time,
      out_time,
    });

    if (!updatedVisit) {
      res.status(404).json({
        success: false,
        message: 'Visit not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedVisit,
    });
  } catch (error: any) {
    console.error('Error updating visit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function deleteVisit(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid visit ID',
      });
      return;
    }

    const deleted = await visitsService.deleteVisit(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Visit not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Visit deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting visit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

