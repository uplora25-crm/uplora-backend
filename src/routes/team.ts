/**
 * Team Routes
 *
 * Routes for team members endpoints.
 */

import { Router } from 'express';
import {
  getAllTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/team.controller';

const router = Router();

router.get('/', getAllTeamMembers);
router.get('/:id', getTeamMemberById);
router.post('/', createTeamMember);
router.patch('/:id', updateTeamMember);
router.delete('/:id', deleteTeamMember);

export default router;

