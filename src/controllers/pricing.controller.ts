/**
 * Pricing Controller
 *
 * Handles HTTP requests for pricing/subscription plans endpoints.
 */

import { Request, Response } from 'express';
import * as pricingService from '../services/pricing.service';

export async function getPlans(req: Request, res: Response): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const plans = includeInactive 
      ? await pricingService.getAllPlans()
      : await pricingService.getActivePlans();

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function getPlan(req: Request, res: Response): Promise<void> {
  try {
    const planId = parseInt(req.params.id, 10);
    if (Number.isNaN(planId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid plan ID',
      });
      return;
    }

    const plan = await pricingService.getPlanById(planId);
    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error('Error fetching plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, price, currency, billing_period, features, is_active, is_custom, display_order } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({
        success: false,
        message: 'Name and price are required',
      });
      return;
    }

    if (price < 0) {
      res.status(400).json({
        success: false,
        message: 'Price cannot be negative',
      });
      return;
    }

    const plan = await pricingService.createPlan({
      name,
      description,
      price: parseFloat(price),
      currency: currency || 'INR',
      billing_period: billing_period || 'monthly',
      features: Array.isArray(features) ? features : features ? [features] : undefined,
      is_active: is_active !== undefined ? is_active : true,
      is_custom: is_custom !== undefined ? is_custom : true,
      display_order: display_order || 0,
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  try {
    const planId = parseInt(req.params.id, 10);
    if (Number.isNaN(planId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid plan ID',
      });
      return;
    }

    const { name, description, price, currency, billing_period, features, is_active, display_order } = req.body;

    if (price !== undefined && price < 0) {
      res.status(400).json({
        success: false,
        message: 'Price cannot be negative',
      });
      return;
    }

    const plan = await pricingService.updatePlan(planId, {
      name,
      description,
      price: price !== undefined ? parseFloat(price) : undefined,
      currency,
      billing_period,
      features: Array.isArray(features) ? features : features ? [features] : undefined,
      is_active,
      display_order,
    });

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export async function deletePlan(req: Request, res: Response): Promise<void> {
  try {
    const planId = parseInt(req.params.id, 10);
    if (Number.isNaN(planId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid plan ID',
      });
      return;
    }

    const deleted = await pricingService.deletePlan(planId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

