/**
 * Notifications Service
 *
 * Handles database operations for user notifications.
 */

import pool from '../lib/db';

export interface Notification {
  id: number;
  user_email: string;
  type: string;
  title: string;
  message: string | null;
  related_task_id: number | null;
  related_lead_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

function mapNotificationRow(row: any): Notification {
  return {
    id: row.id,
    user_email: row.user_email,
    type: row.type,
    title: row.title,
    message: row.message,
    related_task_id: row.related_task_id,
    related_lead_id: row.related_lead_id,
    is_read: row.is_read,
    created_at: new Date(row.created_at).toISOString(),
    read_at: row.read_at ? new Date(row.read_at).toISOString() : null,
  };
}

/**
 * Create a new notification
 */
export async function createNotification(data: {
  userEmail: string;
  type: string;
  title: string;
  message?: string;
  relatedTaskId?: number;
  relatedLeadId?: number;
}): Promise<Notification> {
  const query = `
    INSERT INTO notifications (user_email, type, title, message, related_task_id, related_lead_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, (NOW() AT TIME ZONE 'UTC')::timestamp)
    RETURNING *
  `;

  const result = await pool.query(query, [
    data.userEmail,
    data.type,
    data.title,
    data.message || null,
    data.relatedTaskId || null,
    data.relatedLeadId || null,
  ]);

  return mapNotificationRow(result.rows[0]);
}

/**
 * Get all notifications for a user
 */
export async function getNotificationsForUser(userEmail: string): Promise<Notification[]> {
  const query = `
    SELECT 
      id,
      user_email,
      type,
      title,
      message,
      related_task_id,
      related_lead_id,
      is_read,
      (created_at AT TIME ZONE 'UTC')::timestamptz as created_at,
      CASE WHEN read_at IS NULL THEN NULL ELSE (read_at AT TIME ZONE 'UTC')::timestamptz END as read_at
    FROM notifications
    WHERE user_email = $1
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const result = await pool.query(query, [userEmail]);
  return result.rows.map(mapNotificationRow);
}

/**
 * Get unread notifications count for a user
 */
export async function getUnreadCount(userEmail: string): Promise<number> {
  const query = `
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_email = $1 AND is_read = false
  `;

  const result = await pool.query(query, [userEmail]);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: number, userEmail: string): Promise<Notification | null> {
  const query = `
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE id = $1 AND user_email = $2
    RETURNING *
  `;

  const result = await pool.query(query, [notificationId, userEmail]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapNotificationRow(result.rows[0]);
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userEmail: string): Promise<void> {
  const query = `
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE user_email = $1 AND is_read = false
  `;

  await pool.query(query, [userEmail]);
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: number, userEmail: string): Promise<boolean> {
  const query = `
    DELETE FROM notifications
    WHERE id = $1 AND user_email = $2
  `;

  const result = await pool.query(query, [notificationId, userEmail]);
  return result.rowCount !== null && result.rowCount > 0;
}

