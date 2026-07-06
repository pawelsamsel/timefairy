import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import { DEFAULT_FALLBACK_MIN_TASK_MINUTES } from "@timefairy/shared-types";
import { toDateInputValue, dayBoundsLocal } from "@/lib/datetime";
import { entryTimeRange } from "@/lib/entry-time-range";
import { isMomentEntry } from "@/lib/time-entry-kind";
import {
  snapTimelineMinutesToGrid,
  type TimelineGridConfig,
} from "@/lib/timeline-grid";
import {
  TIMELINE_END_HOUR,
  TIMELINE_START_HOUR,
  snapTimelineMinutes,
  slotToFormDatetimeLocal,
  type MinuteRange,
  type TimelineDropSlot,
} from "@/lib/timeline";

export type MobileGapDockSide = "leading" | "trailing";

export type MobileGapClickPayload = {
  slot: TimelineDropSlot;
  dockSide?: MobileGapDockSide;
};

export type MobileTimelineGapRow = {
  type: "gap";
  slot: TimelineDropSlot;
  dockSide: MobileGapDockSide;
};

export type MobileTimelineEntryRow = {
  type: "entry";
  entry: TimeEntryWithRelations;
  range: MinuteRange;
};

export type MobileTimelineMomentRow = {
  type: "moment";
  entry: TimeEntryWithRelations;
  startMinutes: number;
};

export type MobileTimelineRow =
  | MobileTimelineGapRow
  | MobileTimelineEntryRow
  | MobileTimelineMomentRow;

const DAY_START_MINUTES = TIMELINE_START_HOUR * 60;
const DAY_END_MINUTES = TIMELINE_END_HOUR * 60;

export function entryMinuteRangeOnDay(
  entry: TimeEntryWithRelations,
  dayStr: string,
): MinuteRange | null {
  if (!entry.startAt) return null;

  const range = entryTimeRange(entry);
  if (!range) return null;

  const { from, to } = dayBoundsLocal(dayStr);
  const dayStart = new Date(from).getTime();
  const dayEnd = new Date(to).getTime();
  const overlapStart = Math.max(range.start.getTime(), dayStart);
  const overlapEnd = Math.min(range.end.getTime(), dayEnd);
  if (overlapEnd <= overlapStart) return null;

  const startDate = new Date(overlapStart);
  const endDate = new Date(overlapEnd);
  return {
    start: startDate.getHours() * 60 + startDate.getMinutes(),
    end: endDate.getHours() * 60 + endDate.getMinutes(),
  };
}

function momentStartMinutesOnDay(entry: TimeEntryWithRelations, dayStr: string): number | null {
  if (!entry.startAt) return null;
  const key = `${new Date(entry.startAt).getFullYear()}-${String(new Date(entry.startAt).getMonth() + 1).padStart(2, "0")}-${String(new Date(entry.startAt).getDate()).padStart(2, "0")}`;
  if (key !== dayStr) return null;
  const date = new Date(entry.startAt);
  return date.getHours() * 60 + date.getMinutes();
}

function gapSlot(startMinutes: number, endMinutes: number): TimelineDropSlot | null {
  const durationMinutes = endMinutes - startMinutes;
  if (durationMinutes <= 0) return null;
  return { startMinutes, durationMinutes };
}

export function buildMobileDayTimelineRows(
  entries: TimeEntryWithRelations[],
  dateStr: string,
): MobileTimelineRow[] {
  const timed: MobileTimelineEntryRow[] = [];
  const moments: MobileTimelineMomentRow[] = [];

  for (const entry of entries) {
    if (isMomentEntry(entry)) {
      const startMinutes = momentStartMinutesOnDay(entry, dateStr);
      if (startMinutes != null) {
        moments.push({ type: "moment", entry, startMinutes });
      }
      continue;
    }

    const range = entryMinuteRangeOnDay(entry, dateStr);
    if (range) {
      timed.push({ type: "entry", entry, range });
    }
  }

  timed.sort((a, b) => a.range.start - b.range.start || a.range.end - b.range.end);
  moments.sort((a, b) => a.startMinutes - b.startMinutes);

  const rows: MobileTimelineRow[] = [];

  const timedStarts = timed.map((row) => row.range.start);
  const timedEnds = timed.map((row) => row.range.end);
  const firstTimedStart = timedStarts.length > 0 ? Math.min(...timedStarts) : null;
  const lastTimedEnd = timedEnds.length > 0 ? Math.max(...timedEnds) : null;

  const momentStarts = moments.map((row) => row.startMinutes);
  const firstMomentStart = momentStarts.length > 0 ? Math.min(...momentStarts) : null;
  const lastMomentStart = momentStarts.length > 0 ? Math.max(...momentStarts) : null;

  const firstActivityStart = [firstTimedStart, firstMomentStart]
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b)[0];
  const lastActivityEnd = lastTimedEnd ?? lastMomentStart ?? null;

  if (firstActivityStart != null && firstActivityStart > DAY_START_MINUTES) {
    const slot = gapSlot(DAY_START_MINUTES, firstActivityStart);
    if (slot) rows.push({ type: "gap", slot, dockSide: "trailing" });
  }

  const combined = [
    ...timed.map((row) => ({
      kind: "entry" as const,
      start: row.range.start,
      end: row.range.end,
      row,
    })),
    ...moments.map((row) => ({
      kind: "moment" as const,
      start: row.startMinutes,
      end: row.startMinutes,
      row,
    })),
  ].sort((a, b) => a.start - b.start || a.end - b.end);

  for (let index = 0; index < combined.length; index++) {
    const current = combined[index];
    const previous = combined[index - 1];

    if (previous && current.start > previous.end) {
      const slot = gapSlot(previous.end, current.start);
      if (slot) rows.push({ type: "gap", slot, dockSide: "trailing" });
    }

    rows.push(current.row);
  }

  if (lastActivityEnd != null && lastActivityEnd < DAY_END_MINUTES) {
    const slot = gapSlot(lastActivityEnd, DAY_END_MINUTES);
    if (slot) rows.push({ type: "gap", slot, dockSide: "leading" });
  }

  if (rows.length === 0) {
    const slot = gapSlot(DAY_START_MINUTES, DAY_END_MINUTES);
    if (slot) rows.push({ type: "gap", slot, dockSide: "trailing" });
  }

  return rows;
}

export function isEmptyMobileDayTimeline(rows: MobileTimelineRow[]): boolean {
  return rows.length === 1 && rows[0].type === "gap" && isUnconstrainedGapSlot(rows[0].slot);
}

export function fullDayGapSlot(): TimelineDropSlot {
  return { startMinutes: DAY_START_MINUTES, durationMinutes: DAY_END_MINUTES - DAY_START_MINUTES };
}

export function formatMinutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatMinuteRangeLabel(startMinutes: number, endMinutes: number): string {
  return `${formatMinutesLabel(startMinutes)} – ${formatMinutesLabel(endMinutes)}`;
}

export function formatGapSlotLabel(slot: TimelineDropSlot): string {
  return formatMinuteRangeLabel(slot.startMinutes, slot.startMinutes + slot.durationMinutes);
}

export function isUnconstrainedGapSlot(slot: TimelineDropSlot): boolean {
  return (
    slot.startMinutes === DAY_START_MINUTES &&
    slot.startMinutes + slot.durationMinutes === DAY_END_MINUTES
  );
}

function resolveMinEntryMinutes(
  config: Pick<TimelineGridConfig, "minEntryMinutes">,
): number {
  return config.minEntryMinutes > 0 ? config.minEntryMinutes : DEFAULT_FALLBACK_MIN_TASK_MINUTES;
}

export function resolveMobileGapFillRange(
  slot: TimelineDropSlot,
  dateStr: string,
  config: Pick<TimelineGridConfig, "minEntryMinutes" | "gridStepMinutes" | "useTimeGrid">,
  options: { dockSide?: MobileGapDockSide } = {},
): { startMinutes: number; durationMinutes: number } {
  const slotEnd = slot.startMinutes + slot.durationMinutes;
  const minDuration = resolveMinEntryMinutes(config);
  const durationMinutes = Math.min(minDuration, slot.durationMinutes);

  if (durationMinutes <= 0) {
    return { startMinutes: slot.startMinutes, durationMinutes: Math.max(1, slot.durationMinutes) };
  }

  const snapStart = (minutes: number) =>
    config.useTimeGrid
      ? snapTimelineMinutesToGrid(minutes, config.gridStepMinutes)
      : snapTimelineMinutes(minutes, config.gridStepMinutes);

  const clampStart = (candidate: number) =>
    Math.max(slot.startMinutes, Math.min(candidate, slotEnd - durationMinutes));

  const today = toDateInputValue(new Date());
  const unconstrained = isUnconstrainedGapSlot(slot);

  if (unconstrained && dateStr === today) {
    const nowMinutes = snapStart(new Date().getHours() * 60 + new Date().getMinutes());
    return { startMinutes: clampStart(nowMinutes), durationMinutes };
  }

  if (options.dockSide === "trailing") {
    const startMinutes = clampStart(snapStart(slotEnd - durationMinutes));
    return { startMinutes, durationMinutes };
  }

  if (options.dockSide === "leading") {
    const startMinutes = clampStart(snapStart(slot.startMinutes));
    return { startMinutes, durationMinutes };
  }

  let startMinutes = slot.startMinutes;

  if (dateStr === today) {
    const nowMinutes = snapStart(new Date().getHours() * 60 + new Date().getMinutes());
    if (nowMinutes >= slot.startMinutes && nowMinutes <= slotEnd - durationMinutes) {
      startMinutes = nowMinutes;
    } else if (nowMinutes >= slot.startMinutes && nowMinutes < slotEnd) {
      startMinutes = clampStart(nowMinutes);
    } else {
      startMinutes = clampStart(snapStart(slot.startMinutes));
    }
  } else {
    startMinutes = clampStart(snapStart(slot.startMinutes));
  }

  return { startMinutes, durationMinutes };
}

export function buildMobileNowLogFormDefaults(
  config: Pick<TimelineGridConfig, "minEntryMinutes" | "gridStepMinutes" | "useTimeGrid">,
): { dateStr: string; startAt: string; endAt: string } {
  const dateStr = toDateInputValue(new Date());
  const fill = resolveMobileGapFillRange(fullDayGapSlot(), dateStr, config);
  const { startAt, endAt } = slotToFormDatetimeLocal(
    dateStr,
    { startMinutes: fill.startMinutes, durationMinutes: fill.durationMinutes },
    fill.durationMinutes,
  );
  return { dateStr, startAt, endAt };
}
