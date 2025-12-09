/**
 * Task Types
 *
 * Tasks are follow-ups tied to a lead. Each task is assigned to a team member
 * via their email address so we can build simple "My Tasks" views.
 */

export type Task = {
  id: number; // Serial primary key
  lead_id: number | null; // The lead this task belongs to (nullable)
  client_id: string | null; // The client this task belongs to (nullable, UUID string)
  assigned_to_email: string; // Email of the teammate responsible
  title: string; // Short description of the follow-up
  due_date: string | null; // ISO string or null if no due date
  status: string; // 'open' | 'in_progress' | 'done'
  priority: string; // 'low' | 'normal' | 'high'
  created_at: string; // ISO timestamp for creation
  updated_at: string; // ISO timestamp for last update
};

