/**
 * Tasks Controller
 *
 * Tasks are simple follow-ups tied to a lead. These handlers expose endpoints
 * for "My Tasks", lead-specific tasks, creating tasks, and updating their status.
 */

import { Request, Response } from 'express';
import * as tasksService from '../services/tasks.service';
import {
  validateCreateTask,
  validateUpdateTaskStatus,
  validateUpdateTask,
} from '../validators/tasks.validator';

function handleValidationError(res: Response, error: any) {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: error.errors?.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  });
}

export async function getMyTasks(req: Request, res: Response): Promise<void> {
  try {
    const email = req.header('x-user-email');
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const tasks = await tasksService.listTasksForUser(email);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks for user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process task request',
    });
  }
}

export async function getLeadTasks(req: Request, res: Response): Promise<void> {
  try {
    const leadId = parseInt(req.params.id, 10);
    if (Number.isNaN(leadId)) {
      res.status(400).json({ success: false, message: 'Invalid lead id' });
      return;
    }

    const tasks = await tasksService.listTasksForLead(leadId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks for lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process task request',
    });
  }
}

export async function getClientTasks(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.params.id;
    if (!clientId) {
      res.status(400).json({ success: false, message: 'Invalid client id' });
      return;
    }

    const tasks = await tasksService.listTasksForClient(clientId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching client tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process task request',
    });
  }
}

export async function createLeadTask(req: Request, res: Response): Promise<void> {
  try {
    const leadId = parseInt(req.params.id, 10);
    if (Number.isNaN(leadId)) {
      res.status(400).json({ success: false, message: 'Invalid lead id' });
      return;
    }

    const validation = validateCreateTask(req.body);
    if (!validation.success) {
      handleValidationError(res, validation.errors);
      return;
    }

    const payload = validation.data!;
    const task = await tasksService.createTask({
      leadId,
      assignedToEmail: payload.assignedToEmail,
      title: payload.title,
      description: payload.description,
      dueDate: payload.dueDate,
      priority: payload.priority,
    });

    // Return task with attachment URLs (empty array for now, files uploaded separately)
    res.status(201).json({ 
      success: true, 
      data: {
        ...task,
        attachments: [], // Will be populated when files are uploaded
      }
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process task request',
    });
  }
}

/**
 * Create a new task for a client.
 */
export async function createClientTask(req: Request, res: Response): Promise<void> {
  try {
    const clientId = req.params.id;
    if (!clientId) {
      res.status(400).json({ success: false, message: 'Invalid client id' });
      return;
    }

    const validation = validateCreateTask(req.body);
    if (!validation.success) {
      handleValidationError(res, validation.errors);
      return;
    }

    const payload = validation.data!;
    const task = await tasksService.createTask({
      clientId,
      assignedToEmail: payload.assignedToEmail,
      title: payload.title,
      description: payload.description,
      dueDate: payload.dueDate,
      priority: payload.priority,
    });

    // Return task with attachment URLs (empty array for now, files uploaded separately)
    res.status(201).json({ 
      success: true, 
      data: {
        ...task,
        attachments: [], // Will be populated when files are uploaded
      }
    });
  } catch (error: any) {
    console.error('Error creating client task:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process task request',
    });
  }
}

export async function updateTaskStatus(req: Request, res: Response): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (Number.isNaN(taskId)) {
      res.status(400).json({ success: false, message: 'Invalid task id' });
      return;
    }

    const validation = validateUpdateTaskStatus(req.body);
    if (!validation.success) {
      handleValidationError(res, validation.errors);
      return;
    }

    const payload = validation.data!;
    const task = await tasksService.updateTaskStatus({
      taskId,
      status: payload.status,
    });

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process task request',
    });
  }
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (Number.isNaN(taskId)) {
      res.status(400).json({ success: false, message: 'Invalid task id' });
      return;
    }

    const validation = validateUpdateTask(req.body);
    if (!validation.success) {
      handleValidationError(res, validation.errors);
      return;
    }

    const payload = validation.data!;
    const updatedTask = await tasksService.updateTask({
      taskId,
      title: payload.title,
      assignedToEmail: payload.assignedToEmail,
      dueDate: payload.dueDate,
      status: payload.status,
      priority: payload.priority,
    });

    res.json({ success: true, data: updatedTask });
  } catch (error: any) {
    console.error('Error updating task:', error);
    if (error.message?.includes('does not exist')) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }
    if (error.message === 'At least one field must be provided for update') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
    });
  }
}

