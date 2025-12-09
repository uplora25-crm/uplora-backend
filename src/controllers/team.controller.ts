/**
 * Team Controller
 *
 * Handles HTTP requests for team members endpoints.
 */

import { Request, Response } from 'express';
import * as teamService from '../services/team.service';

export async function getAllTeamMembers(req: Request, res: Response): Promise<void> {
  try {
    const members = await teamService.getAllTeamMembers();
    res.status(200).json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getTeamMemberById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid team member ID',
      });
      return;
    }

    const member = await teamService.getTeamMemberById(id);
    if (!member) {
      res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    console.error('Error fetching team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function createTeamMember(req: Request, res: Response): Promise<void> {
  try {
    const { email, name, password, role, is_active } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({
        success: false,
        message: 'email, name, and password are required',
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
      return;
    }

    const newMember = await teamService.createTeamMember({
      email,
      name,
      password,
      role,
      is_active,
    });

    res.status(201).json({
      success: true,
      data: newMember,
    });
  } catch (error: any) {
    console.error('Error creating team member:', error);
    const errorMessage = error.message || 'Failed to create team member';
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    });
  }
}

export async function updateTeamMember(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid team member ID',
      });
      return;
    }

    const { name, role, is_active } = req.body;
    const updatedMember = await teamService.updateTeamMember(id, {
      name,
      role,
      is_active,
    });

    if (!updatedMember) {
      res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedMember,
    });
  } catch (error: any) {
    console.error('Error updating team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function deleteTeamMember(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid team member ID',
      });
      return;
    }

    const deleted = await teamService.deleteTeamMember(id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Team member deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

