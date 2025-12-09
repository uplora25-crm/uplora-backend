/**
 * Clients Controller
 *
 * Handles HTTP requests for clients (contacts) endpoints.
 */

import { Request, Response } from 'express';
import * as clientsService from '../services/clients.service';

export async function getAllClients(req: Request, res: Response): Promise<void> {
  try {
    const clients = await clientsService.getAllClients();
    res.status(200).json({
      success: true,
      data: clients,
      count: clients.length,
    });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getClientById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid client ID',
      });
      return;
    }

    const client = await clientsService.getClientById(id);
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function createClient(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, phone, company, lead_id } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: 'name is required',
      });
      return;
    }

    const newClient = await clientsService.createClient({
      name,
      email,
      phone,
      company,
      lead_id: lead_id ? parseInt(lead_id, 10) : undefined,
    });

    res.status(201).json({
      success: true,
      data: newClient,
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function updateClient(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid client ID',
      });
      return;
    }

    const { name, email, phone, company } = req.body;
    const updatedClient = await clientsService.updateClient(id, {
      name,
      email,
      phone,
      company,
    });

    if (!updatedClient) {
      res.status(404).json({
        success: false,
        message: 'Client not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedClient,
    });
  } catch (error: any) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function deleteClient(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid client ID',
      });
      return;
    }

    // Check if client exists
    const client = await clientsService.getClientById(id);
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found',
      });
      return;
    }

    // Soft delete the client (move to trash)
    const deleted = await clientsService.deleteClient(id);
    if (!deleted) {
      res.status(400).json({
        success: false,
        message: 'Failed to move client to trash. The client may already be deleted.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Client moved to trash successfully',
    });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getDeletedClients(req: Request, res: Response): Promise<void> {
  try {
    const clients = await clientsService.getDeletedClients();
    res.status(200).json({
      success: true,
      data: clients,
      count: clients.length,
    });
  } catch (error: any) {
    console.error('Error fetching deleted clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deleted clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function restoreClient(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid client ID',
      });
      return;
    }

    const restored = await clientsService.restoreClient(id);
    if (!restored) {
      res.status(400).json({
        success: false,
        message: 'Failed to restore client. The client may not be in trash.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Client restored successfully',
    });
  } catch (error: any) {
    console.error('Error restoring client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function permanentDeleteClient(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid client ID',
      });
      return;
    }

    const deleted = await clientsService.permanentDeleteClient(id);
    if (!deleted) {
      res.status(400).json({
        success: false,
        message: 'Failed to permanently delete client. The client may not be in trash.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Client permanently deleted successfully',
    });
  } catch (error: any) {
    console.error('Error permanently deleting client:', error);
    
    // Check for foreign key constraint violations
    if (error.code === '23503' || error.message?.includes('foreign key')) {
      res.status(400).json({
        success: false,
        message: 'Cannot permanently delete client: This client has associated leads, deals, or activities. Please remove these associations first.',
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete client',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

