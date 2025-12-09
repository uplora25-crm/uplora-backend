/**
 * Tasks Validator
 *
 * Uses Zod to keep request payloads safe and beginner-friendly.
 */

import { z } from 'zod';

const PRIORITY_VALUES = ['low', 'normal', 'high'] as const;
const STATUS_VALUES = ['open', 'in_progress', 'done'] as const;

export const createTaskSchema = z.object({
  assignedToEmail: z.string().email('assignedToEmail must be a valid email'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(1000, 'Description is too long').optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD'))
    .optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: z.enum(STATUS_VALUES),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export function validateCreateTask(data: unknown) {
  const result = createTaskSchema.safeParse(data);
  if (result.success) {
    return { success: true as const, data: result.data };
  }

  return { success: false as const, errors: result.error };
}

export function validateUpdateTaskStatus(data: unknown) {
  const result = updateTaskStatusSchema.safeParse(data);
  if (result.success) {
    return { success: true as const, data: result.data };
  }

  return { success: false as const, errors: result.error };
}

export const updateTaskSchema = z
  .object({
    title: z.string().min(1, 'Title cannot be empty').optional(),
    assignedToEmail: z.string().email('assignedToEmail must be a valid email').optional(),
    description: z.string().max(1000, 'Description is too long').optional(),
    dueDate: z.string().optional(),
    status: z.enum(STATUS_VALUES).optional(),
    priority: z.enum(PRIORITY_VALUES).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.assignedToEmail !== undefined ||
      data.description !== undefined ||
      data.dueDate !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined,
    { message: 'At least one field must be provided' }
  );

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export function validateUpdateTask(data: unknown) {
  const result = updateTaskSchema.safeParse(data);
  if (result.success) {
    return { success: true as const, data: result.data };
  }

  return { success: false as const, errors: result.error };
}

