/**
 * Tasks Routes
 *
 * Tasks are follow-ups tied to leads. These endpoints provide:
 * - /api/tasks/my for "My Tasks" based on assigned email
 * - /api/leads/:id/tasks for lead-specific tasks
 * - POST /api/leads/:id/tasks to create new tasks
 * - POST /api/clients/:id/tasks to create tasks for clients
 * - PATCH /api/tasks/:id/status to mark tasks done/in progress
 * - Task attachment endpoints
 */

import { Router } from 'express';
import {
  getMyTasks,
  getLeadTasks,
  getClientTasks,
  createLeadTask,
  createClientTask,
  updateTaskStatus,
  updateTask,
} from '../controllers/tasks.controller';
import {
  getTaskAttachments,
  uploadTaskAttachment,
  downloadAttachment,
  deleteAttachment,
  upload,
} from '../controllers/task-attachments.controller';

const router = Router();

router.get('/tasks/my', getMyTasks);
router.get('/leads/:id/tasks', getLeadTasks);
router.get('/clients/:id/tasks', getClientTasks);
router.post('/leads/:id/tasks', createLeadTask);
router.post('/clients/:id/tasks', createClientTask);
router.patch('/tasks/:id/status', updateTaskStatus);
router.patch('/tasks/:id', updateTask);

// Task attachment routes
router.get('/tasks/:taskId/attachments', getTaskAttachments);
router.post('/tasks/:taskId/attachments', upload.single('file'), uploadTaskAttachment);
router.get('/task-attachments/:id/download', downloadAttachment);
router.delete('/task-attachments/:id', deleteAttachment);

export default router;

