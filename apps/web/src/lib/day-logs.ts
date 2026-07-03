import type { DayLog } from "@timefairy/shared-types";

export type DayLogDayState = {
  note: string;
  isDayOff: boolean | null;
};

export function dayLogsByDate(logs: DayLog[]): Map<string, DayLogDayState> {
  return new Map(
    logs.map((log) => [log.date, { note: log.note, isDayOff: log.isDayOff }]),
  );
}

export function resolveDayOffOverride(
  dayLogs: Map<string, DayLogDayState>,
  date: string,
): boolean | null {
  return dayLogs.get(date)?.isDayOff ?? null;
}
