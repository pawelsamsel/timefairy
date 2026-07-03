import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import { addDays, dayBoundsLocal, toDateInputValue } from "./datetime";

export function entryLocalDateKey(entry: TimeEntryWithRelations): string {
  const iso = entry.startAt ?? entry.createdAt;
  return toDateInputValue(new Date(iso));
}

export function entryTimeRange(
  entry: Pick<TimeEntryWithRelations, "startAt" | "endAt" | "durationMinutes">,
): { start: Date; end: Date } | null {
  if (!entry.startAt) return null;

  const start = new Date(entry.startAt);
  if (entry.endAt) {
    const end = new Date(entry.endAt);
    if (end.getTime() > start.getTime()) return { start, end };
  }

  if (entry.durationMinutes && entry.durationMinutes > 0) {
    return {
      start,
      end: new Date(start.getTime() + entry.durationMinutes * 60_000),
    };
  }

  return {
    start,
    end: new Date(start.getTime() + 15 * 60_000),
  };
}

export function entryOverlapsDay(entry: TimeEntryWithRelations, dayStr: string): boolean {
  return entryMinutesOnDay(entry, dayStr) > 0;
}

export function entryMinutesOnDay(entry: TimeEntryWithRelations, dayStr: string): number {
  if (!entry.startAt) {
    return entryLocalDateKey(entry) === dayStr ? (entry.durationMinutes ?? 0) : 0;
  }

  const range = entryTimeRange(entry);
  if (!range) return 0;

  const { from, to } = dayBoundsLocal(dayStr);
  const dayStart = new Date(from).getTime();
  const dayEnd = new Date(to).getTime();
  const overlapStart = Math.max(range.start.getTime(), dayStart);
  const overlapEnd = Math.min(range.end.getTime(), dayEnd);
  if (overlapEnd <= overlapStart) return 0;

  return Math.round((overlapEnd - overlapStart) / 60_000);
}

export function entryAffectedDates(entry: TimeEntryWithRelations): string[] {
  if (!entry.startAt) {
    return [entryLocalDateKey(entry)];
  }

  const range = entryTimeRange(entry);
  if (!range) return [entryLocalDateKey(entry)];

  const dates: string[] = [];
  let day = toDateInputValue(range.start);
  const lastDay = toDateInputValue(range.end);

  while (day <= lastDay) {
    if (entryMinutesOnDay(entry, day) > 0) dates.push(day);
    day = addDays(day, 1);
  }

  return dates;
}

export function extendedDayFetchRange(dateStr: string): { from: string; to: string } {
  const bounds = dayBoundsLocal(dateStr);
  const previousDay = addDays(dateStr, -1);
  return {
    from: dayBoundsLocal(previousDay).from,
    to: bounds.to,
  };
}

export function extendedMonthFetchRange(fromDate: string, toDate: string): { from: string; to: string } {
  const previousDay = addDays(fromDate, -1);
  return {
    from: dayBoundsLocal(previousDay).from,
    to: dayBoundsLocal(toDate).to,
  };
}
