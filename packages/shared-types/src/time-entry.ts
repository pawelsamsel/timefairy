import { z } from "zod";
import { EntrySource } from "./enums";

const createTimeEntryBaseSchema = z.object({
  laneId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  title: z.string().optional(),
  note: z.string().optional(),
  source: z
    .enum([EntrySource.WEB, EntrySource.CLI, EntrySource.MOBILE, EntrySource.DESKTOP, EntrySource.AI])
    .default(EntrySource.WEB),
});

export const createTimeEntrySchema = createTimeEntryBaseSchema
  .refine((d) => d.durationMinutes != null || d.startAt != null, {
    message: "Provide start time or duration",
  })
  .refine((d) => !d.endAt || d.startAt, {
    message: "End time requires start time",
  })
  .refine((d) => !d.endAt || !d.startAt || new Date(d.endAt) > new Date(d.startAt), {
    message: "End time must be after start time",
  });
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

export const updateTimeEntrySchema = createTimeEntryBaseSchema
  .extend({
    taskId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    startAt: z.string().datetime().nullable().optional(),
    endAt: z.string().datetime().nullable().optional(),
    durationMinutes: z.number().int().positive().nullable().optional(),
  })
  .partial();
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

export const timeEntrySchema = z.object({
  id: z.string().uuid(),
  laneId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  clientId: z.string().uuid().nullable(),
  startAt: z.string().datetime().nullable(),
  endAt: z.string().datetime().nullable(),
  durationMinutes: z.number().nullable(),
  title: z.string().nullable(),
  note: z.string().nullable(),
  source: z.enum([EntrySource.WEB, EntrySource.CLI, EntrySource.MOBILE, EntrySource.DESKTOP, EntrySource.AI]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TimeEntry = z.infer<typeof timeEntrySchema>;

export const timeEntryListQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  laneId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});
export type TimeEntryListQuery = z.infer<typeof timeEntryListQuerySchema>;

export type TimeEntryWithRelations = TimeEntry & {
  lane?: { id: string; name: string; type: string; color: string };
  project?: { id: string; name: string; color?: string } | null;
  client?: { id: string; name: string } | null;
  task?: { id: string; title: string; externalId?: string | null } | null;
};

export const timeEntrySummarySchema = z.object({
  projectId: z.string().uuid().nullable(),
  projectName: z.string().nullable(),
  clientId: z.string().uuid().nullable(),
  clientName: z.string().nullable(),
  totalMinutes: z.number(),
});
export type TimeEntrySummary = z.infer<typeof timeEntrySummarySchema>;
