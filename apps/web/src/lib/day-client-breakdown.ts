import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import { entryMinutesOnDay } from "./entry-time-range";

export type ClientDayMinutes = {
  clientId: string | null;
  clientName: string;
  totalMinutes: number;
};

const NO_CLIENT_KEY = "__none__";

export function buildClientDayMinutesBreakdown(
  entries: TimeEntryWithRelations[],
  dateStr: string,
  projectClientIds: ReadonlyMap<string, string>,
  clientNames: ReadonlyMap<string, string>,
): ClientDayMinutes[] {
  const totals = new Map<string, ClientDayMinutes>();

  for (const entry of entries) {
    const minutes = entryMinutesOnDay(entry, dateStr);
    if (minutes <= 0) continue;

    const clientId = entry.projectId ? (projectClientIds.get(entry.projectId) ?? null) : null;
    const key = clientId ?? NO_CLIENT_KEY;
    const clientName = clientId ? (clientNames.get(clientId) ?? "Unknown client") : "No client";

    const current = totals.get(key) ?? { clientId, clientName, totalMinutes: 0 };
    current.totalMinutes += minutes;
    totals.set(key, current);
  }

  return Array.from(totals.values()).sort((a, b) => {
    if (b.totalMinutes !== a.totalMinutes) return b.totalMinutes - a.totalMinutes;
    return a.clientName.localeCompare(b.clientName);
  });
}
