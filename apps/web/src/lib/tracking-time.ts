import type { TimeEntryWithRelations, WorkHoursPreferences } from "@timefairy/shared-types";
import { isWorkDay } from "@/lib/work-hours";

export function isWithinTypicalWorkHours(now: Date, prefs: WorkHoursPreferences): boolean {
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (!isWorkDay(dateStr, prefs)) return false;
  const hour = now.getHours();
  return hour >= 9 && hour < 18;
}

export function formatElapsedDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

export function elapsedSecondsFromStart(startAtIso: string, nowMs = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - new Date(startAtIso).getTime()) / 1000));
}

export function latestEntryActivityAt(
  entries: TimeEntryWithRelations[],
  date: string,
): Date | null {
  let latest: Date | null = null;

  for (const entry of entries) {
    const candidates = [entry.startAt, entry.endAt].filter(Boolean) as string[];
    for (const iso of candidates) {
      const moment = new Date(iso);
      const key = `${moment.getFullYear()}-${String(moment.getMonth() + 1).padStart(2, "0")}-${String(moment.getDate()).padStart(2, "0")}`;
      if (key !== date) continue;
      if (!latest || moment > latest) latest = moment;
    }
  }

  return latest;
}
