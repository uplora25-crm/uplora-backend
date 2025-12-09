/**
 * Chat Controller
 *
 * Handles HTTP requests for chat endpoints.
 */

import { Request, Response } from 'express';
import * as chatService from '../services/chat.service';

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const senderEmail = req.header('x-user-email');
    if (!senderEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const { receiverEmail, message } = req.body;

    if (!receiverEmail || !message) {
      res.status(400).json({
        success: false,
        message: 'Missing receiverEmail or message',
      });
      return;
    }

    if (senderEmail === receiverEmail) {
      res.status(400).json({
        success: false,
        message: 'Cannot send message to yourself',
      });
      return;
    }

    const chatMessage = await chatService.createChatMessage({
      senderEmail,
      receiverEmail,
      message: message.trim(),
    });

    res.status(201).json({
      success: true,
      data: chatMessage,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  try {
    const userEmail = req.header('x-user-email');
    if (!userEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const { otherUserEmail } = req.params;

    if (!otherUserEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing otherUserEmail parameter',
      });
      return;
    }

    const messages = await chatService.getConversation(userEmail, otherUserEmail);

    // Mark messages as read when fetching conversation
    await chatService.markMessagesAsRead(userEmail, otherUserEmail);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    const userEmail = req.header('x-user-email');
    if (!userEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const conversations = await chatService.getUserConversations(userEmail);

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userEmail = req.header('x-user-email');
    if (!userEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing x-user-email header',
      });
      return;
    }

    const { senderEmail } = req.body;

    if (!senderEmail) {
      res.status(400).json({
        success: false,
        message: 'Missing senderEmail',
      });
      return;
    }

    await chatService.markMessagesAsRead(userEmail, senderEmail);

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
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

    const count = await chatService.getUnreadMessageCount(userEmail);

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

