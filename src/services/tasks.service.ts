/**
 * Tasks Service
 *
 * Tasks are lightweight follow-ups tied to a lead. This service contains the
 * database logic for listing, creating, and updating tasks.
 */

import pool from '../lib/db';
import type { Task } from '../types/tasks';
import * as notificationsService from './notifications.service';

const VALID_STATUS = ['open', 'in_progress', 'done'] as const;
const VALID_PRIORITY = ['low', 'normal', 'high'] as const;

function mapTaskRow(row: any): Task {
  return {
    id: row.id,
    lead_id: row.lead_id,
    client_id: row.client_id ? String(row.client_id) : null, // UUID as string
    assigned_to_email: row.assigned_to_email,
    title: row.title,
    due_date: row.due_date ? new Date(row.due_date).toISOString() : null,
    status: row.status,
    priority: row.priority,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

/**
 * List all tasks assigned to a specific email (for "My Tasks" view).
 */
export async function listTasksForUser(email: string): Promise<Task[]> {
  const query = `
    SELECT *
    FROM team_tasks
    WHERE assigned_to_email = $1
    ORDER BY
      CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
      due_date ASC,
      created_at DESC
  `;

  const result = await pool.query(query, [email]);
  return result.rows.map(mapTaskRow);
}

/**
 * List all tasks for a given lead.
 */
export async function listTasksForLead(leadId: number): Promise<Task[]> {
  const query = `
    SELECT *
    FROM team_tasks
    WHERE lead_id = $1
    ORDER BY
      CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
      due_date ASC,
      created_at DESC
  `;

  const result = await pool.query(query, [leadId]);
  return result.rows.map(mapTaskRow);
}

/**
 * List all tasks for a given client.
 */
export async function listTasksForClient(clientId: string): Promise<Task[]> {
  const query = `
    SELECT *
    FROM team_tasks
    WHERE client_id = $1
    ORDER BY
      CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
      due_date ASC,
      created_at DESC
  `;

  const result = await pool.query(query, [clientId]);
  return result.rows.map(mapTaskRow);
}

type CreateTaskParams = {
  leadId?: number | null;
  clientId?: string | null;
  assignedToEmail: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  priority?: string;
};

/**
 * Create a new task attached to a lead or client.
 * Either leadId or clientId must be provided, but not both.
 */
export async function createTask(params: CreateTaskParams): Promise<Task> {
  // Validate that exactly one of leadId or clientId is provided
  if (!params.leadId && !params.clientId) {
    throw new Error('Either leadId or clientId must be provided');
  }
  if (params.leadId && params.clientId) {
    throw new Error('Cannot assign task to both lead and client. Please provide either leadId or clientId, not both.');
  }

  const priority = params.priority && VALID_PRIORITY.includes(params.priority as any)
    ? params.priority
    : 'normal';

  // Try to insert with description, fallback if column doesn't exist
  let query = `
    INSERT INTO team_tasks (lead_id, client_id, assigned_to_email, title, description, due_date, priority)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  let values: any[] = [
    params.leadId || null,
    params.clientId || null, // UUID string
    params.assignedToEmail,
    params.title,
    params.description || null,
    params.dueDate || null,
    priority,
  ];

  // clientId is a UUID string from contacts table
  // team_tasks.client_id is UUID type to match contacts.id
  let result;
  try {
    result = await pool.query(query, values);
  } catch (error: any) {
    // If description column doesn't exist, fallback to query without it
    if (error.message && error.message.includes('column') && error.message.includes('description')) {
      query = `
        INSERT INTO team_tasks (lead_id, client_id, assigned_to_email, title, due_date, priority)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      values = [
        params.leadId || null,
        params.clientId || null,
        params.assignedToEmail,
        params.title,
        params.dueDate || null,
        priority,
      ];
      result = await pool.query(query, values);
    } else {
      throw error;
    }
  }

  const task = mapTaskRow(result.rows[0]);

  // Create activity for the lead or client
  try {
    if (params.leadId) {
      // Create activity for lead
      const activityQuery = `
        INSERT INTO activities (lead_id, activity_type, description, created_at)
        VALUES ($1, 'task', $2, NOW())
      `;
      await pool.query(activityQuery, [
        params.leadId,
        `Task created: "${params.title}"${params.description ? ` - ${params.description}` : ''}`,
      ]);
    } else if (params.clientId) {
      // For clients, we need to find the associated lead_id from the client's lead_id field
      // or create an activity linked to the client's contact_id
      const clientQuery = `
        SELECT id, lead_id FROM contacts WHERE id = $1 AND is_client = true
      `;
      const clientResult = await pool.query(clientQuery, [params.clientId]);
      
      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0];
        // If client has a lead_id, create activity for that lead
        if (client.lead_id) {
          const activityQuery = `
            INSERT INTO activities (lead_id, activity_type, description, created_at)
            VALUES ($1, 'task', $2, NOW())
          `;
          await pool.query(activityQuery, [
            client.lead_id,
            `Task created: "${params.title}"${params.description ? ` - ${params.description}` : ''}`,
          ]);
        } else {
          // If no lead_id, create activity with contact_id (UUID)
          const activityQuery = `
            INSERT INTO activities (contact_id, activity_type, description, created_at)
            VALUES ($1, 'task', $2, NOW())
          `;
          await pool.query(activityQuery, [
            params.clientId, // UUID string
            `Task created: "${params.title}"${params.description ? ` - ${params.description}` : ''}`,
          ]);
        }
      } else {
        // If client not found, still create activity with contact_id as fallback
        const activityQuery = `
          INSERT INTO activities (contact_id, activity_type, description, created_at)
          VALUES ($1, 'task', $2, NOW())
        `;
        await pool.query(activityQuery, [
          params.clientId, // UUID string
          `Task created: "${params.title}"${params.description ? ` - ${params.description}` : ''}`,
        ]);
      }
    }
  } catch (error) {
    // Log error but don't fail task creation if activity creation fails
    console.error('Failed to create activity for task:', error);
  }

  // Create notification for the assigned user
  try {
    await notificationsService.createNotification({
      userEmail: params.assignedToEmail,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${params.title}"`,
      relatedTaskId: task.id,
      relatedLeadId: params.leadId || undefined,
    });
  } catch (error) {
    // Log error but don't fail task creation if notification fails
    console.error('Failed to create notification for task:', error);
  }

  return task;
}

type UpdateTaskStatusParams = {
  taskId: number;
  status: string;
};

/**
 * Update the status (open/in_progress/done) for a task.
 */
export async function updateTaskStatus(params: UpdateTaskStatusParams): Promise<Task> {
  if (!VALID_STATUS.includes(params.status as any)) {
    throw new Error(`Invalid status: ${params.status}`);
  }

  const query = `
    UPDATE team_tasks
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [params.status, params.taskId]);

  if (result.rows.length === 0) {
    throw new Error(`Task with id ${params.taskId} does not exist`);
  }

  return mapTaskRow(result.rows[0]);
}

type UpdateTaskParams = {
  taskId: number;
  title?: string;
  assignedToEmail?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: string;
  priority?: string;
};

/**
 * Partially updates a task. Only provided fields are changed.
 * Helpful when editing title, assignee, due date, status, or priority.
 */
export async function updateTask(params: UpdateTaskParams): Promise<Task> {
  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (params.title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(params.title);
  }
  if (params.assignedToEmail !== undefined) {
    fields.push(`assigned_to_email = $${index++}`);
    values.push(params.assignedToEmail);
  }
  if (params.description !== undefined) {
    fields.push(`description = $${index++}`);
    values.push(params.description || null);
  }
  if (params.dueDate !== undefined) {
    fields.push(`due_date = $${index++}`);
    values.push(params.dueDate || null);
  }
  if (params.status !== undefined) {
    if (!VALID_STATUS.includes(params.status as any)) {
      throw new Error(`Invalid status: ${params.status}`);
    }
    fields.push(`status = $${index++}`);
    values.push(params.status);
  }
  if (params.priority !== undefined) {
    if (!VALID_PRIORITY.includes(params.priority as any)) {
      throw new Error(`Invalid priority: ${params.priority}`);
    }
    fields.push(`priority = $${index++}`);
    values.push(params.priority);
  }

  if (fields.length === 0) {
    throw new Error('At least one field must be provided for update');
  }

  // Always update updated_at timestamp
  fields.push(`updated_at = NOW()`);

  const query = `
    UPDATE team_tasks
    SET ${fields.join(', ')}
    WHERE id = $${index}
    RETURNING *
  `;

  values.push(params.taskId);

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    throw new Error(`Task with id ${params.taskId} does not exist`);
  }

  const task = mapTaskRow(result.rows[0]);

  // Create notification for task update
  // Notify the assignee (new assignee if changed, otherwise current assignee)
  const assigneeEmail = params.assignedToEmail !== undefined ? params.assignedToEmail : task.assigned_to_email;
  
  if (assigneeEmail) {
    // Get lead_id - either from task or from client's lead_id
    let leadId: number | undefined = task.lead_id || undefined;
    
    // If task is associated with a client, try to get the lead_id from the client
    if (!leadId && task.client_id) {
      try {
        const clientQuery = `
          SELECT lead_id FROM contacts WHERE id = $1 AND is_client = true
        `;
        const clientResult = await pool.query(clientQuery, [task.client_id]);
        if (clientResult.rows.length > 0 && clientResult.rows[0].lead_id) {
          leadId = clientResult.rows[0].lead_id;
        }
      } catch (error) {
        // Silently fail - we'll just not include lead_id
      }
    }
    
    try {
      // Mark any existing unread notifications for this task as read to avoid confusion
      // This ensures users see the latest notification with the correct timestamp
      if (task.id) {
        try {
          const markReadQuery = `
            UPDATE notifications
            SET is_read = true, read_at = (NOW() AT TIME ZONE 'UTC')::timestamp
            WHERE related_task_id = $1 
              AND user_email = $2 
              AND is_read = false
              AND type IN ('task_assigned', 'task_updated')
          `;
          await pool.query(markReadQuery, [task.id, assigneeEmail]);
        } catch (markReadError) {
          // Silently fail - not critical
          console.error('Failed to mark old notifications as read:', markReadError);
        }
      }
      
      // Create new notification with current timestamp
      await notificationsService.createNotification({
        userEmail: assigneeEmail,
        type: 'task_updated',
        title: 'Task Updated',
        message: `Task "${task.title}" has been updated`,
        relatedTaskId: task.id,
        relatedLeadId: leadId,
      });
    } catch (error) {
      // Log error but don't fail task update if notification creation fails
      console.error('Failed to create notification for task update:', error);
    }
  }

  return task;
}

