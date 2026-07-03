import type {
  Client,
  Project,
  TimeEntryWithRelations,
  WorkHoursPreferences,
} from "@timefairy/shared-types";
import { DEFAULT_WORK_HOURS_PREFERENCES } from "@timefairy/shared-types";
import type { DayViewFilters } from "./day-view-preferences";

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
  const billableProjectIds = new Set(
    projects.filter((project) => project.hourlyRate > 0).map((project) => project.id),
  );
  return entries.filter(
    (entry) => entry.projectId != null && billableProjectIds.has(entry.projectId),
  );
}

export function resolveDayStatus(
  date: string,
  summary: { status: "met" | "below" } | undefined,
  prefs: WorkHoursPreferences,
): "none" | "below" | "met" | "off" {
  const hasEntries = summary != null;
  if (!isWorkDay(date, prefs) && !hasEntries) return "off";
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
