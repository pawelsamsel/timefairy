import { LaneType, type TimeEntryWithRelations } from "@timefairy/shared-types";

export type EntryFormKind = "block" | "event";

export function isMomentEntry(
  entry: Pick<TimeEntryWithRelations, "startAt" | "endAt" | "durationMinutes" | "lane">,
): boolean {
  if (!entry.startAt || entry.endAt) return false;
  if (entry.durationMinutes != null && entry.durationMinutes > 0) return false;
  return entry.lane?.type === LaneType.EVENTS;
}

export function isDurationOnlyEntry(
  entry: Pick<TimeEntryWithRelations, "startAt" | "durationMinutes">,
): boolean {
  return !entry.startAt && entry.durationMinutes != null && entry.durationMinutes > 0;
}

export function entryFormKindFromEntry(
  entry: Pick<TimeEntryWithRelations, "startAt" | "endAt" | "durationMinutes" | "lane">,
): EntryFormKind | "duration" {
  if (isMomentEntry(entry)) return "event";
  if (isDurationOnlyEntry(entry)) return "duration";
  return "block";
}

export function findEventsLaneId(
  lanes: Array<{ id: string; type: string; name: string }>,
): string | undefined {
  return (
    lanes.find((l) => l.type === LaneType.EVENTS)?.id ??
    lanes.find((l) => l.name === "Wydarzenia")?.id
  );
}

export function findLoggedLaneId(
  lanes: Array<{ id: string; type: string; name: string }>,
): string | undefined {
  return (
    lanes.find((l) => l.type === LaneType.LOGGED)?.id ??
    lanes.find((l) => l.name === "Główny")?.id ??
    lanes[0]?.id
  );
}
