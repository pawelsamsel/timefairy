import { z } from "zod";
import { TaskStatus } from "./enums";

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  title: z.string().min(1),
  externalId: z.string().max(128).optional(),
  externalUrl: optionalUrl,
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]).default(TaskStatus.TODO),
  note: z.string().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  title: z.string(),
  externalId: z.string().nullable(),
  externalUrl: z.string().nullable(),
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]),
  note: z.string().nullable(),
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
