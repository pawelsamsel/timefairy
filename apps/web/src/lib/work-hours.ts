import type {
  Client,
  Project,
  TimeEntryWithRelations,
  WorkHoursPreferences,
} from "@timefairy/shared-types";
import { DEFAULT_WORK_HOURS_PREFERENCES } from "@timefairy/shared-types";
import type { DayViewFilters } from "./day-view-preferences";
import { entryMinutesOnDay } from "./entry-time-range";

export function isWorkDay(dateStr: string, prefs: WorkHoursPreferences): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  if (dayOfWeek === 0) return prefs.includeSundays;
  if (dayOfWeek === 6) return prefs.includeSaturdays;
  return true;
}

export function mergeClientWorkHours(
  userPrefs: WorkHoursPreferences,
  client: Pick<Client, "dailyWorkHours" | "includeSaturdays" | "includeSundays">,
): WorkHoursPreferences {
  return {
    ...userPrefs,
    dailyWorkHours: client.dailyWorkHours ?? userPrefs.dailyWorkHours,
    includeSaturdays: client.includeSaturdays ?? userPrefs.includeSaturdays,
    includeSundays: client.includeSundays ?? userPrefs.includeSundays,
  };
}

export function resolveEffectiveWorkHoursPreferences(
  userPrefs: WorkHoursPreferences,
  filters: DayViewFilters,
  clients: Client[],
): WorkHoursPreferences {
  if (filters.clientIds.length !== 1) return userPrefs;
  const client = clients.find((item) => item.id === filters.clientIds[0]);
  if (!client) return userPrefs;
  return mergeClientWorkHours(userPrefs, client);
}

export function filterBillableEntries(
  entries: TimeEntryWithRelations[],
  projects: Project[],
  onlyBillable: boolean,
): TimeEntryWithRelations[] {
  if (!onlyBillable) return entries;
  if (projects.length === 0) return [];
  const billableProjectIds = new Set(
    projects.filter((project) => project.isBillable).map((project) => project.id),
  );
  return entries.filter(
    (entry) => entry.projectId != null && billableProjectIds.has(entry.projectId),
  );
}

export function sumEntryMinutesOnDay(
  entries: readonly TimeEntryWithRelations[],
  dateStr: string,
  projects: readonly Project[],
  onlyBillable: boolean,
): number {
  const countedEntries = filterBillableEntries([...entries], [...projects], onlyBillable);
  return countedEntries.reduce((sum, entry) => sum + entryMinutesOnDay(entry, dateStr), 0);
}

export function resolveDayStatus(
  date: string,
  summary: { status: "met" | "below" } | undefined,
  prefs: WorkHoursPreferences,
  dayOffOverride?: boolean | null,
): "none" | "below" | "met" | "off" {
  const hasEntries = summary != null;
  if (dayOffOverride === true && !hasEntries) return "off";
  if (!isWorkDay(date, prefs) && !hasEntries && dayOffOverride !== false) return "off";
  if (!hasEntries) return "none";
  return summary.status;
}

export function fallbackWorkHoursPreferences(
  prefs?: Partial<WorkHoursPreferences> | null,
): WorkHoursPreferences {
  return {
    ...DEFAULT_WORK_HOURS_PREFERENCES,
    ...prefs,
  };
}
