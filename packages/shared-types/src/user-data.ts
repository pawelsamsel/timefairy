import { z } from "zod";
import { EntrySource, LaneType, TaskStatus } from "./enums";

export const USER_DATA_EXPORT_VERSION = 1;

const isoDate = z.string();

export const exportClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  note: z.string().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const exportLaneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum([LaneType.LOGGED, LaneType.PLANNED, LaneType.EVENTS, LaneType.CUSTOM]),
  isDefault: z.boolean(),
  color: z.string(),
  sortOrder: z.number().int(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const exportProjectSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string(),
  color: z.string().optional(),
  hourlyRate: z.string(),
  currency: z.string(),
  note: z.string().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const exportTaskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  title: z.string(),
  externalId: z.string().nullable(),
  externalUrl: z.string().nullable(),
  status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]),
  note: z.string().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const exportTimeEntrySchema = z.object({
  id: z.string().uuid(),
  laneId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  clientId: z.string().uuid().nullable(),
  startAt: isoDate.nullable(),
  endAt: isoDate.nullable(),
  durationMinutes: z.number().int().nullable(),
  title: z.string().nullable(),
  note: z.string().nullable(),
  source: z.enum([
    EntrySource.WEB,
    EntrySource.CLI,
    EntrySource.MOBILE,
    EntrySource.DESKTOP,
    EntrySource.AI,
  ]),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const exportEventSchema = z.object({
  id: z.string().uuid(),
  laneId: z.string().uuid().nullable(),
  title: z.string(),
  startAt: isoDate,
  endAt: isoDate.nullable(),
  isAllDay: z.boolean(),
  isMomentary: z.boolean(),
  note: z.string().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const exportPlannedBlockSchema = z.object({
  id: z.string().uuid(),
  laneId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  startAt: isoDate,
  endAt: isoDate,
  note: z.string().nullable(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const userDataExportSchema = z.object({
  version: z.literal(USER_DATA_EXPORT_VERSION),
  exportedAt: isoDate,
  profile: z.object({
    email: z.string().email(),
    name: z.string(),
    timezone: z.string(),
  }),
  clients: z.array(exportClientSchema),
  lanes: z.array(exportLaneSchema),
  projects: z.array(exportProjectSchema),
  tasks: z.array(exportTaskSchema),
  timeEntries: z.array(exportTimeEntrySchema),
  events: z.array(exportEventSchema),
  plannedBlocks: z.array(exportPlannedBlockSchema),
});
export type UserDataExport = z.infer<typeof userDataExportSchema>;

export const userDataImportResultSchema = z.object({
  created: z.object({
    clients: z.number().int(),
    lanes: z.number().int(),
    projects: z.number().int(),
    tasks: z.number().int(),
    timeEntries: z.number().int(),
    events: z.number().int(),
    plannedBlocks: z.number().int(),
  }),
  updated: z.object({
    clients: z.number().int(),
    lanes: z.number().int(),
    projects: z.number().int(),
    tasks: z.number().int(),
    timeEntries: z.number().int(),
    events: z.number().int(),
    plannedBlocks: z.number().int(),
  }),
  idRemapped: z.number().int(),
});
export type UserDataImportResult = z.infer<typeof userDataImportResultSchema>;
