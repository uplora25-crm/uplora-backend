/**
 * Leads Validation Module
 * 
 * This file uses Zod (a TypeScript-first schema validation library) to validate
 * incoming request data for the leads API endpoints.
 * 
 * Zod ensures that the data matches the expected structure and types before
 * it reaches our business logic, preventing errors and security issues.
 */

import { z } from 'zod';

/**
 * Schema for validating contact information
 * This defines what fields a contact must have and their types
 */
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone number is too long').optional().or(z.literal('')),
  company: z.string().max(255, 'Company name is too long').optional().or(z.literal('')),
});

/**
 * Schema for validating lead creation request body
 * This is what we expect when someone creates a new lead via POST /api/leads
 */
export const createLeadSchema = z.object({
  // Contact information - required object with name, optional email and phone
  contact: contactSchema,
  // Source of the lead (e.g., 'website', 'referral', 'cold_call')
  source: z.string().max(100, 'Source is too long').optional(),
  // Stage of the lead in the sales pipeline (e.g., 'new', 'qualified', 'proposal')
  stage: z.string().max(100, 'Stage is too long').optional(),
  // Vertical/Industry of the lead (e.g., 'Healthcare', 'Finance', 'Technology')
  verticals: z.string().max(255, 'Verticals is too long').optional(),
});

/**
 * TypeScript type inferred from the schema
 * This gives us type safety - we can use CreateLeadInput in our code
 * and TypeScript will know exactly what fields are available
 */
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

/**
 * Validates a request body against the createLeadSchema
 * 
 * @param data - The data to validate (usually from req.body)
 * @returns An object with success status and either validated data or errors
 */
export function validateCreateLead(data: unknown): {
  success: boolean;
  data?: CreateLeadInput;
  errors?: z.ZodError;
} {
  const result = createLeadSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Schema for validating activity creation request body
 * This is what we expect when someone creates a new activity via POST /api/leads/:id/activities
 */
export const createActivitySchema = z.object({
  // Type of activity (e.g., 'call', 'email', 'meeting', 'note')
  // Must be a non-empty string
  activityType: z.string().min(1, 'Activity type is required').max(100, 'Activity type is too long'),
  // Optional description of the activity
  description: z.string().max(1000, 'Description is too long').optional(),
});

/**
 * TypeScript type inferred from the schema
 */
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

/**
 * Validates a request body against the createActivitySchema
 * 
 * @param data - The data to validate (usually from req.body)
 * @returns An object with success status and either validated data or errors
 */
export function validateCreateActivity(data: unknown): {
  success: boolean;
  data?: CreateActivityInput;
  errors?: z.ZodError;
} {
  const result = createActivitySchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Schema for validating cold call creation request body
 * This is what we expect when someone creates a new cold call via POST /api/leads/:id/cold-calls
 */
export const createColdCallSchema = z.object({
  // Outcome of the cold call (e.g., 'connected', 'no_answer', 'wrong_number')
  // Must be a non-empty string
  outcome: z.string().min(1, 'Outcome is required').max(100, 'Outcome is too long'),
  // Optional notes about the call
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

/**
 * TypeScript type inferred from the schema
 */
export type CreateColdCallInput = z.infer<typeof createColdCallSchema>;

/**
 * Validates a request body against the createColdCallSchema
 * 
 * @param data - The data to validate (usually from req.body)
 * @returns An object with success status and either validated data or errors
 */
export function validateCreateColdCall(data: unknown): {
  success: boolean;
  data?: CreateColdCallInput;
  errors?: z.ZodError;
} {
  const result = createColdCallSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Schema for validating onsite visit creation request body
 * This is what we expect when someone creates a new onsite visit via POST /api/leads/:id/onsite-visits
 */
export const createOnsiteVisitSchema = z.object({
  // Location/address of the visit
  // Must be a non-empty string
  location: z.string().min(1, 'Location is required').max(255, 'Location is too long'),
  // Outcome of the visit (e.g., 'meeting_done', 'rescheduled', 'no_show')
  // Must be a non-empty string
  outcome: z.string().min(1, 'Outcome is required').max(100, 'Outcome is too long'),
  // Optional notes about the visit
  notes: z.string().max(1000, 'Notes are too long').optional(),
  // Optional in time (time when visit started)
  in_time: z.string().optional(),
  // Optional out time (time when visit ended)
  out_time: z.string().optional(),
  // Optional rescheduled date (when visit was rescheduled to, or 'dont_know')
  rescheduled_date: z.string().optional(),
});

/**
 * TypeScript type inferred from the schema
 */
export type CreateOnsiteVisitInput = z.infer<typeof createOnsiteVisitSchema>;

/**
 * Validates a request body against the createOnsiteVisitSchema
 * 
 * @param data - The data to validate (usually from req.body)
 * @returns An object with success status and either validated data or errors
 */
export function validateCreateOnsiteVisit(data: unknown): {
  success: boolean;
  data?: CreateOnsiteVisitInput;
  errors?: z.ZodError;
} {
  const result = createOnsiteVisitSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

