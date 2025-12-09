/**
 * Chat Routes
 *
 * Routes for chat endpoints.
 */

import { Router } from 'express';
import {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead,
  getUnreadCount,
} from '../controllers/chat.controller';

const router = Router();

router.post('/send', sendMessage);
router.get('/conversations', getConversations);
router.get('/conversation/:otherUserEmail', getConversation);
router.patch('/mark-read', markAsRead);
router.get('/unread-count', getUnreadCount);

export default router;

