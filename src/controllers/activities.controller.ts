/**
 * Activities Controller
 *
 * Handles HTTP requests for activities endpoints.
 */

import { Request, Response } from 'express';
import * as activitiesService from '../services/activities.service';

export async function getAllActivities(req: Request, res: Response): Promise<void> {
  try {
    const activities = await activitiesService.getAllActivities();
    res.status(200).json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getActivitiesByType(req: Request, res: Response): Promise<void> {
  try {
    const { type } = req.params;
    const activities = await activitiesService.getActivitiesByType(type);
    res.status(200).json({
      success: true,
      data: activities,
      count: activities.length,
    });
  } catch (error: any) {
    console.error('Error fetching activities by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getActivityById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid activity ID',
      });
      return;
    }

    const activity = await activitiesService.getActivityById(id);
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function createActivity(req: Request, res: Response): Promise<void> {
  try {
    const { lead_id, contact_id, activity_type, description } = req.body;

    if (!activity_type) {
      res.status(400).json({
        success: false,
        message: 'activity_type is required',
      });
      return;
    }

    const newActivity = await activitiesService.createActivity({
      lead_id: lead_id ? parseInt(lead_id) : undefined,
      contact_id: contact_id ? parseInt(contact_id) : undefined,
      activity_type,
      description,
    });

    res.status(201).json({
      success: true,
      data: newActivity,
    });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function updateActivity(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid activity ID',
      });
      return;
    }

    const { activity_type, description } = req.body;
    const updatedActivity = await activitiesService.updateActivity(id, {
      activity_type,
      description,
    });

    if (!updatedActivity) {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedActivity,
    });
  } catch (error: any) {
    console.error('Error updating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function deleteActivity(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid activity ID',
      });
      return;
    }

    const deleted = await activitiesService.deleteActivity(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

