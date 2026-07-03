import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import type { WorkHoursPreferences } from "@timefairy/shared-types";
import { addDays, toDateInputValue } from "./datetime";
import { isWorkDay } from "./work-hours";

export type DayLogStatus = "none" | "below" | "met" | "off";

export type DayLogSummary = {
  date: string;
  totalMinutes: number;
  entryCount: number;
  status: "below" | "met";
};

export function entryLocalDateKey(entry: TimeEntryWithRelations): string {
  const iso = entry.startAt ?? entry.createdAt;
  return toDateInputValue(new Date(iso));
}

export function monthBounds(year: number, monthIndex: number): { from: string; to: string; fromDate: string; toDate: string } {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const fromDate = toDateInputValue(firstDay);
  const toDate = toDateInputValue(lastDay);
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString(), fromDate, toDate };
}

export function buildMonthGrid(year: number, monthIndex: number): string[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const gridStart = addDays(toDateInputValue(new Date(year, monthIndex, 1)), -mondayOffset);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const trailing = (7 - ((mondayOffset + daysInMonth) % 7)) % 7;
  const totalCells = mondayOffset + daysInMonth + trailing;

  return Array.from({ length: totalCells }, (_, index) => addDays(gridStart, index));
}

export function summarizeEntriesByDay(
  entries: TimeEntryWithRelations[],
  prefs: WorkHoursPreferences,
): Map<string, DayLogSummary> {
  const minMinutes = Math.round(prefs.dailyWorkHours * 60);
  const byDay = new Map<string, { totalMinutes: number; entryCount: number }>();

  for (const entry of entries) {
    const date = entryLocalDateKey(entry);
    const current = byDay.get(date) ?? { totalMinutes: 0, entryCount: 0 };
    current.totalMinutes += entry.durationMinutes ?? 0;
    current.entryCount += 1;
    byDay.set(date, current);
  }

  const summaries = new Map<string, DayLogSummary>();
  for (const [date, stats] of byDay) {
    const status = stats.totalMinutes >= minMinutes ? "met" : "below";
    summaries.set(date, { date, ...stats, status });
  }

  return summaries;
}

export function countMonthWorkDayStats(
  year: number,
  monthIndex: number,
  daySummaries: Map<string, DayLogSummary>,
  prefs: WorkHoursPreferences,
) {
  let daysWithEntries = 0;
  let daysMet = 0;
  let daysBelow = 0;
  let totalMinutes = 0;
  let workDays = 0;

  for (let day = 1; day <= new Date(year, monthIndex + 1, 0).getDate(); day += 1) {
    const date = toDateInputValue(new Date(year, monthIndex, day));
    if (!isWorkDay(date, prefs)) continue;
    workDays += 1;
    const summary = daySummaries.get(date);
    if (!summary) continue;
    daysWithEntries += 1;
    totalMinutes += summary.totalMinutes;
    if (summary.status === "met") daysMet += 1;
    if (summary.status === "below") daysBelow += 1;
  }

  return { daysWithEntries, daysMet, daysBelow, totalMinutes, workDays };
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function parseMonthInput(value: string): { year: number; monthIndex: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export function toMonthInputValue(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function dateParts(dateStr: string): { year: number; monthIndex: number } {
  const [year, month] = dateStr.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}
