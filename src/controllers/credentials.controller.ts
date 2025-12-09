/**
 * Credentials Controller Module
 * 
 * Handles HTTP requests and responses for credentials endpoints.
 */

import { Request, Response } from 'express';
import * as credentialsService from '../services/credentials.service';

/**
 * Handles GET /api/clients/:clientId/credentials - Gets all credentials for a client
 */
export async function getCredentialsByClient(req: Request, res: Response): Promise<void> {
  try {
    const { clientId } = req.params;
    
    if (!clientId) {
      res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
      return;
    }
    
    const credentials = await credentialsService.getCredentialsByClientId(clientId);
    
    res.status(200).json({
      success: true,
      data: credentials,
      count: credentials.length,
    });
  } catch (error: any) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credentials',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles GET /api/credentials/:id - Gets a single credential by ID
 */
export async function getCredentialById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Credential ID is required',
      });
      return;
    }
    
    const credentialId = parseInt(id, 10);
    if (isNaN(credentialId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid credential ID',
      });
      return;
    }
    
    const credential = await credentialsService.getCredentialById(credentialId);
    
    if (!credential) {
      res.status(404).json({
        success: false,
        message: 'Credential not found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: credential,
    });
  } catch (error: any) {
    console.error('Error fetching credential:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credential',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles POST /api/clients/:clientId/credentials - Creates a new credential
 */
export async function createCredential(req: Request, res: Response): Promise<void> {
  try {
    const { clientId } = req.params;
    const { title, url, username, password } = req.body;
    
    if (!clientId) {
      res.status(400).json({
        success: false,
        message: 'Client ID is required',
      });
      return;
    }
    
    if (!title || !password) {
      res.status(400).json({
        success: false,
        message: 'Title and password are required',
      });
      return;
    }
    
    const credential = await credentialsService.createCredential({
      client_id: clientId,
      title,
      url,
      username,
      password,
    });
    
    res.status(201).json({
      success: true,
      data: credential,
      message: 'Credential created successfully',
    });
  } catch (error: any) {
    console.error('Error creating credential:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create credential',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles PATCH /api/credentials/:id - Updates a credential
 */
export async function updateCredential(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, url, username, password } = req.body;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Credential ID is required',
      });
      return;
    }
    
    const credentialId = parseInt(id, 10);
    if (isNaN(credentialId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid credential ID',
      });
      return;
    }
    
    const credential = await credentialsService.updateCredential(credentialId, {
      title,
      url,
      username,
      password,
    });
    
    res.status(200).json({
      success: true,
      data: credential,
      message: 'Credential updated successfully',
    });
  } catch (error: any) {
    if (error.message === 'Credential not found') {
      res.status(404).json({
        success: false,
        message: 'Credential not found',
      });
      return;
    }
    
    console.error('Error updating credential:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update credential',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * Handles DELETE /api/credentials/:id - Deletes a credential
 */
export async function deleteCredential(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Credential ID is required',
      });
      return;
    }
    
    const credentialId = parseInt(id, 10);
    if (isNaN(credentialId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid credential ID',
      });
      return;
    }
    
    await credentialsService.deleteCredential(credentialId);
    
    res.status(200).json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Credential not found') {
      res.status(404).json({
        success: false,
        message: 'Credential not found',
      });
      return;
    }
    
    console.error('Error deleting credential:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete credential',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

