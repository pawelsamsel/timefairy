import { z } from "zod";
import { TrackTimeMode } from "./enums";

export const workHoursPreferencesSchema = z.object({
  dailyWorkHours: z.number().positive(),
  includeSaturdays: z.boolean(),
  includeSundays: z.boolean(),
  onlyBillableProjects: z.boolean(),
  trackTimeMode: z.enum([TrackTimeMode.SINGLE, TrackTimeMode.MULTI, TrackTimeMode.ASK]),
  minimalTaskMinutes: z.number().int().min(1).max(240),
  useTimeGrid: z.boolean(),
});
export type WorkHoursPreferences = z.infer<typeof workHoursPreferencesSchema>;

export const updateWorkHoursPreferencesSchema = workHoursPreferencesSchema.partial();
export type UpdateWorkHoursPreferencesInput = z.infer<typeof updateWorkHoursPreferencesSchema>;

export const DEFAULT_WORK_HOURS_PREFERENCES: WorkHoursPreferences = {
  dailyWorkHours: 8,
  includeSaturdays: false,
  includeSundays: false,
  onlyBillableProjects: false,
  trackTimeMode: TrackTimeMode.SINGLE,
  minimalTaskMinutes: 15,
  useTimeGrid: false,
};

export const DEFAULT_FALLBACK_MIN_TASK_MINUTES = 30;

export const clientWorkHoursOverrideSchema = z.object({
  dailyWorkHours: z.number().positive().nullable().optional(),
  includeSaturdays: z.boolean().nullable().optional(),
  includeSundays: z.boolean().nullable().optional(),
  defaultHourlyRate: z.number().nonnegative().nullable().optional(),
  defaultCurrency: z.string().length(3).nullable().optional(),
});
export type ClientWorkHoursOverride = z.infer<typeof clientWorkHoursOverrideSchema>;
