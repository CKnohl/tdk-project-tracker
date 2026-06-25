import { z } from 'zod';

export const projectNumberSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[0-9]{7}[A-Z]*$/, 'Format: YYYYXXX with optional suffix letters (e.g. 2026021, 2025528P)'),
  );

export const projectStatusEnum = z.enum(['active', 'on_hold', 'inactive']);
export const projectPhaseEnum = z.enum([
  'proposal', 'survey', 'existing_conditions', 'concept_design', 'engineering_design',
  'client_review', 'municipal_review', 'permitting', 'bidding', 'construction', 'closeout', 'completed',
]);
export const workflowStateEnum = z.enum(['normal', 'awaiting_response', 'needs_follow_up', 'urgent_follow_up']);
export const inactiveReasonEnum = z.enum(['completed', 'lost_bid', 'cancelled', 'fell_through']);
export const taskStatusEnum = z.enum(['not_started', 'in_progress', 'waiting', 'completed', 'cancelled']);
export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskRecurrenceEnum = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']);
export const submittalStatusEnum = z.enum([
  'drafting', 'ready_to_submit', 'submitted', 'awaiting_response', 'revision_required', 'approved', 'rejected',
]);
export const contactRoleEnum = z.enum([
  'client', 'attorney', 'contractor', 'surveyor', 'planner',
  'municipal_reviewer', 'architect', 'engineer', 'inspector', 'other',
]);
export const calendarEventTypeEnum = z.enum([
  'deadline', 'meeting', 'submittal', 'site_visit', 'follow_up', 'milestone', 'custom',
]);

const optionalDate = z.string().date().optional().or(z.literal('').transform(() => undefined));
const optionalText = z.string().trim().optional().or(z.literal('').transform(() => undefined));

export const projectSchema = z
  .object({
    project_number: projectNumberSchema,
    name: z.string().trim().min(2, 'Name is required'),
    company_id: z.coerce.number().int().positive('Select a company'),
    status: projectStatusEnum.default('active'),
    phase: projectPhaseEnum.default('proposal'),
    workflow_state: workflowStateEnum.default('normal'),
    description: optionalText,
    scope: optionalText,
    project_manager_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
    target_completion_date: optionalDate,
    inactive_reason: inactiveReasonEnum.optional(),
    staff_ids: z.array(z.string().uuid()).default([]),
  })
  .refine((d) => d.status !== 'inactive' || !!d.inactive_reason, {
    message: 'Inactive projects require a reason',
    path: ['inactive_reason'],
  });
export type ProjectInput = z.infer<typeof projectSchema>;

export const taskSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(2, 'Task name is required'),
  description: optionalText,
  priority: taskPriorityEnum.default('medium'),
  status: taskStatusEnum.default('not_started'),
  start_date: optionalDate,
  due_date: optionalDate,
  completion_pct: z.coerce.number().int().min(0).max(100).default(0),
  notes: optionalText,
  recurrence: taskRecurrenceEnum.default('none'),
  staff_ids: z.array(z.string().uuid()).default([]),
});
export type TaskInput = z.infer<typeof taskSchema>;

// Standalone office task — same shape minus the project association.
export const generalTaskSchema = z.object({
  name: z.string().trim().min(2, 'Task name is required'),
  description: optionalText,
  priority: taskPriorityEnum.default('medium'),
  status: taskStatusEnum.default('not_started'),
  start_date: optionalDate,
  due_date: optionalDate,
  recurrence: taskRecurrenceEnum.default('none'),
  staff_ids: z.array(z.string().uuid()).default([]),
});
export type GeneralTaskInput = z.infer<typeof generalTaskSchema>;

export const submittalSchema = z.object({
  project_id: z.string().uuid(),
  submission_type: z.string().trim().min(2, 'Submission type is required'),
  agency: optionalText,
  submission_date: optionalDate,
  response_due_date: optionalDate,
  follow_up_date: optionalDate,
  assigned_staff_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  status: submittalStatusEnum.default('drafting'),
  notes: optionalText,
});
export type SubmittalInput = z.infer<typeof submittalSchema>;

export const contactSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(2, 'Name is required'),
  company: optionalText,
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  phone: optionalText,
  role: contactRoleEnum.default('other'),
  notes: optionalText,
});
export type ContactInput = z.infer<typeof contactSchema>;

export const noteSchema = z.object({
  project_id: z.string().uuid(),
  body: z.string().trim().min(1, 'Note cannot be empty'),
});
export type NoteInput = z.infer<typeof noteSchema>;

export const staffSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is required'),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  initials: z.string().trim().max(4, 'Max 4 characters').optional().or(z.literal('').transform(() => undefined)),
  company_id: z.coerce.number().int().positive().optional(),
});
export type StaffInput = z.infer<typeof staffSchema>;

export const calendarEventSchema = z.object({
  title: z.string().trim().min(2, 'Title is required'),
  description: optionalText,
  event_type: calendarEventTypeEnum.default('meeting'),
  start_at: z.string().min(1, 'Start is required'),
  end_at: z.string().optional().or(z.literal('').transform(() => undefined)),
  all_day: z.boolean().default(false),
  project_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
});
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
