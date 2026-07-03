import { z } from "zod";
import { TaskStatus } from "./enums";

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalIsoDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const createTaskSchema = z
  .object({
    projectId: z.string().uuid(),
    clientId: z.string().uuid().optional(),
    title: z.string().min(1),
    externalId: z.string().max(128).optional(),
    externalUrl: optionalUrl,
    status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]).default(TaskStatus.TODO),
    note: z.string().optional(),
    pinned: z.boolean().optional(),
    scheduledFrom: optionalIsoDate,
    scheduledTo: optionalIsoDate,
  })
  .superRefine((value, ctx) => {
    if (value.scheduledFrom && value.scheduledTo && value.scheduledFrom > value.scheduledTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date must be on or before due date",
        path: ["scheduledTo"],
      });
    }
  });
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema
  .innerType()
  .partial()
  .extend({
    scheduledFrom: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).optional(),
    scheduledTo: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).optional(),
  })
  .superRefine((value, ctx) => {
    const from =
      value.scheduledFrom === "" || value.scheduledFrom === null
        ? null
        : value.scheduledFrom;
    const to =
      value.scheduledTo === "" || value.scheduledTo === null ? null : value.scheduledTo;
    if (from && to && from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date must be on or before due date",
        path: ["scheduledTo"],
      });
    }
  });
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const reorderTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
});
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;

export const taskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  title: z.string(),
  externalId: z.string().nullable(),
  externalUrl: z.string().nullable(),
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]),
  note: z.string().nullable(),
  sortOrder: z.number().int(),
  pinned: z.boolean(),
  scheduledFrom: z.string().nullable(),
  scheduledTo: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Task = z.infer<typeof taskSchema>;

export type TaskProjectRef = { id: string; name: string; color?: string };
export type TaskClientRef = { id: string; name: string } | null;

export type TaskWithRelations = Task & {
  project: TaskProjectRef;
  client?: TaskClientRef;
  _count?: { timeEntries: number };
};

export type TaskDetail = TaskWithRelations & {
  timeEntries: Array<{
    id: string;
    startAt: string | null;
    endAt: string | null;
    durationMinutes: number | null;
    note: string | null;
    lane?: { id: string; name: string; color: string };
    project?: { id: string; name: string } | null;
  }>;
};
