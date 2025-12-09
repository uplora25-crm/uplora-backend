/**
 * Deals Validation Module
 * 
 * This file uses Zod (a TypeScript-first schema validation library) to validate
 * incoming request data for the deals API endpoints.
 * 
 * Zod ensures that the data matches the expected structure and types before
 * it reaches our business logic, preventing errors and security issues.
 */

import { z } from 'zod';

/**
 * Valid pipeline stages that a deal can be in.
 * These stages represent the progression of a deal through the sales pipeline.
 */
const VALID_STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'closed'] as const;

/**
 * Schema for validating deal creation request body
 * This is what we expect when someone creates a new deal via POST /api/deals
 */
export const createDealSchema = z.object({
  // ID of the lead to create a deal from (required)
  // A Deal is linked to a Lead via lead_id
  leadId: z.number().int().positive('Lead ID must be a positive integer'),
  
  // Optional title/name of the deal
  // If not provided, the service will generate a default title like "Deal for Lead #123"
  title: z.string().max(255, 'Title is too long').optional(),
  
  // Optional monetary value of the deal
  // Can be null if the deal value hasn't been determined yet
  dealValue: z.number().positive('Deal value must be positive').nullable().optional(),
  
  // Optional notes about the deal
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

/**
 * TypeScript type inferred from the schema
 * This gives us type safety - we can use CreateDealInput in our code
 * and TypeScript will know exactly what fields are available
 */
export type CreateDealInput = z.infer<typeof createDealSchema>;

/**
 * Validates a request body against the createDealSchema
 * 
 * @param data - The data to validate (usually from req.body)
 * @returns An object with success status and either validated data or errors
 */
export function validateCreateDeal(data: unknown): {
  success: boolean;
  data?: CreateDealInput;
  errors?: z.ZodError;
} {
  const result = createDealSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Schema for validating deal stage update request body
 * This is what we expect when someone moves a deal to a different stage via PATCH /api/deals/:id/stage
 */
export const moveDealStageSchema = z.object({
  // The new stage to move the deal to
  // Must be one of: 'new', 'qualified', 'proposal', 'negotiation', 'closed'
  stage: z.enum(VALID_STAGES, {
    errorMap: () => ({
      message: `Stage must be one of: ${VALID_STAGES.join(', ')}`,
    }),
  }),
});

/**
 * TypeScript type inferred from the schema
 */
export type MoveDealStageInput = z.infer<typeof moveDealStageSchema>;

/**
 * Validates a request body against the moveDealStageSchema
 * 
 * @param data - The data to validate (usually from req.body)
 * @returns An object with success status and either validated data or errors
 */
export function validateMoveDealStage(data: unknown): {
  success: boolean;
  data?: MoveDealStageInput;
  errors?: z.ZodError;
} {
  const result = moveDealStageSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

