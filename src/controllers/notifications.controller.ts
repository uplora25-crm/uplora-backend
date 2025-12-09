/**
 * Notifications Controller
 *
 * Handles HTTP requests for notifications endpoints.
 */

import { Request, Response } from 'express';
import * as notificationsService from '../services/notifications.service';

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userEmail = req.header('x-user-email');
    if (!userEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const notifications = await notificationsService.getNotificationsForUser(userEmail);
    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const userEmail = req.header('x-user-email');
    if (!userEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const count = await notificationsService.getUnreadCount(userEmail);
    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (Number.isNaN(notificationId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
      });
      return;
    }

    const userEmail = req.header('x-user-email');
    if (!userEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const notification = await notificationsService.markAsRead(notificationId, userEmail);
    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userEmail = req.header('x-user-email');
    if (!userEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    await notificationsService.markAllAsRead(userEmail);
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (Number.isNaN(notificationId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
      });
      return;
    }

    const userEmail = req.header('x-user-email');
    if (!userEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const deleted = await notificationsService.deleteNotification(notificationId, userEmail);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

