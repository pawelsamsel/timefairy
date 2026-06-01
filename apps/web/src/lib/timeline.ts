export const TIMELINE_START_HOUR = 0;
export const TIMELINE_END_HOUR = 24;
export const TIMELINE_DEFAULT_SCROLL_HOUR = 6;
export const TIMELINE_HOUR_HEIGHT_PX = 64;
export const TIMELINE_MIN_ENTRY_MINUTES = 15;

export type TimelineDropSlot = {
  startMinutes: number;
  durationMinutes: number;
};

export type MinuteRange = {
  start: number;
  end: number;
};

export type DropSlotView = {
  slot: TimelineDropSlot;
  available: boolean;
};

export type HourDropLayout = {
  hourSegments: DropSlotView[];
  halfHourSlots: DropSlotView[];
  quarterHourSlots: DropSlotView[];
};

export function entryToMinuteRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  durationMinutes: number | null | undefined,
): MinuteRange | null {
  if (!startAt) return null;

  const start = new Date(startAt);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  let endMinutes: number;

  if (endAt) {
    const end = new Date(endAt);
    endMinutes = end.getHours() * 60 + end.getMinutes();
  } else if (durationMinutes && durationMinutes > 0) {
    endMinutes = startMinutes + durationMinutes;
  } else {
    endMinutes = startMinutes + 15;
  }

  if (endMinutes <= startMinutes) endMinutes = startMinutes + 15;
  return { start: startMinutes, end: endMinutes };
}

export function entriesToOccupiedRanges(
  entries: Array<{
    startAt: string | null;
    endAt: string | null;
    durationMinutes: number | null;
  }>,
): MinuteRange[] {
  return mergeMinuteRanges(
    entries
      .map((e) => entryToMinuteRange(e.startAt, e.endAt, e.durationMinutes))
      .filter((r): r is MinuteRange => r !== null),
  );
}

export function mergeMinuteRanges(ranges: MinuteRange[]): MinuteRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: MinuteRange[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

export function rangesOverlap(a: MinuteRange, b: MinuteRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function slotToRange(slot: TimelineDropSlot): MinuteRange {
  return { start: slot.startMinutes, end: slot.startMinutes + slot.durationMinutes };
}

export function isSlotFullyFree(slot: TimelineDropSlot, occupied: MinuteRange[]): boolean {
  const slotRange = slotToRange(slot);
  return !occupied.some((block) => rangesOverlap(slotRange, block));
}

export function getHourSegments(hour: number, occupied: MinuteRange[]): DropSlotView[] {
  const hourStart = hour * 60;
  const hourEnd = hourStart + 60;

  const blocked = mergeMinuteRanges(
    occupied
      .map((block) => ({
        start: Math.max(block.start, hourStart),
        end: Math.min(block.end, hourEnd),
      }))
      .filter((block) => block.start < block.end),
  );

  if (blocked.length === 0) {
    return [{ slot: { startMinutes: hourStart, durationMinutes: 60 }, available: true }];
  }

  const segments: DropSlotView[] = [];
  let cursor = hourStart;

  for (const block of blocked) {
    if (cursor < block.start) {
      segments.push({
        slot: { startMinutes: cursor, durationMinutes: block.start - cursor },
        available: true,
      });
    }
    segments.push({
      slot: { startMinutes: block.start, durationMinutes: block.end - block.start },
      available: false,
    });
    cursor = block.end;
  }

  if (cursor < hourEnd) {
    segments.push({
      slot: { startMinutes: cursor, durationMinutes: hourEnd - cursor },
      available: true,
    });
  }

  return segments;
}

export function getHourDropLayout(hour: number, occupied: MinuteRange[]): HourDropLayout {
  const base = hour * 60;
  const templateHalf: TimelineDropSlot[] = [
    { startMinutes: base, durationMinutes: 30 },
    { startMinutes: base + 30, durationMinutes: 30 },
  ];
  const templateQuarter: TimelineDropSlot[] = [
    { startMinutes: base, durationMinutes: 15 },
    { startMinutes: base + 15, durationMinutes: 15 },
    { startMinutes: base + 30, durationMinutes: 15 },
    { startMinutes: base + 45, durationMinutes: 15 },
  ];

  return {
    hourSegments: getHourSegments(hour, occupied),
    halfHourSlots: templateHalf.map((slot) => ({
      slot,
      available: isSlotFullyFree(slot, occupied),
    })),
    quarterHourSlots: templateQuarter.map((slot) => ({
      slot,
      available: isSlotFullyFree(slot, occupied),
    })),
  };
}

export function getFreeSlotsInHour(hour: number, occupied: MinuteRange[]): TimelineDropSlot[] {
  return getHourSegments(hour, occupied)
    .filter((segment) => segment.available)
    .map((segment) => segment.slot);
}

export function findFreeSegmentAtMinute(
  minute: number,
  occupied: MinuteRange[],
): TimelineDropSlot | null {
  const hour = Math.floor(minute / 60);
  if (hour < TIMELINE_START_HOUR || hour >= TIMELINE_END_HOUR) return null;

  const slots = getFreeSlotsInHour(hour, occupied);
  const containing = slots.find(
    (slot) => minute >= slot.startMinutes && minute < slot.startMinutes + slot.durationMinutes,
  );
  if (containing) return containing;

  if (slots.length === 0) return null;
  return slots.reduce((best, slot) => {
    const slotMid = slot.startMinutes + slot.durationMinutes / 2;
    const bestMid = best.startMinutes + best.durationMinutes / 2;
    return Math.abs(minute - slotMid) < Math.abs(minute - bestMid) ? slot : best;
  });
}

export function findFreeSegmentContainingMinute(
  minute: number,
  occupied: MinuteRange[],
): TimelineDropSlot | null {
  const hour = Math.floor(minute / 60);
  if (hour < TIMELINE_START_HOUR || hour >= TIMELINE_END_HOUR) return null;

  const slots = getFreeSlotsInHour(hour, occupied);
  return (
    slots.find(
      (slot) =>
        slot.durationMinutes >= TIMELINE_MIN_ENTRY_MINUTES &&
        minute >= slot.startMinutes &&
        minute < slot.startMinutes + slot.durationMinutes,
    ) ?? null
  );
}

export function slotDefaultDurationMinutes(slot: TimelineDropSlot): number {
  return Math.max(
    TIMELINE_MIN_ENTRY_MINUTES,
    Math.min(slot.durationMinutes, 60),
  );
}

export function slotToFormDatetimeLocal(
  dateStr: string,
  slot: TimelineDropSlot,
  durationMinutes = slotDefaultDurationMinutes(slot),
): { startAt: string; endAt: string } {
  const capped = Math.min(durationMinutes, slot.durationMinutes);
  const { startAt, endAt } = minuteRangeToIsoRange(dateStr, {
    start: slot.startMinutes,
    end: slot.startMinutes + capped,
  });
  const toLocal = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return { startAt: toLocal(startAt), endAt: toLocal(endAt) };
}

export function getExpandedDropOptions(hour: number, occupied: MinuteRange[]): TimelineDropSlot[] {
  const free = getFreeSlotsInHour(hour, occupied);
  const seen = new Set<string>();
  const options: TimelineDropSlot[] = [];

  function add(slot: TimelineDropSlot) {
    const key = slotKey(slot);
    if (seen.has(key)) return;
    seen.add(key);
    options.push(slot);
  }

  for (const slot of free) {
    add(slot);

    if (slot.durationMinutes >= 30) {
      for (
        let start = slot.startMinutes;
        start < slot.startMinutes + slot.durationMinutes;
        start += 30
      ) {
        const remaining = slot.startMinutes + slot.durationMinutes - start;
        if (remaining >= 30) {
          add({ startMinutes: start, durationMinutes: 30 });
        }
      }
    }

    if (slot.durationMinutes >= 15) {
      for (
        let start = slot.startMinutes;
        start < slot.startMinutes + slot.durationMinutes;
        start += 15
      ) {
        const remaining = slot.startMinutes + slot.durationMinutes - start;
        if (remaining >= 15) {
          add({ startMinutes: start, durationMinutes: 15 });
        }
      }
    }
  }

  return options.sort((a, b) => a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes);
}

export function clientYToTimelineMinute(
  clientY: number,
  scrollContainer: HTMLElement,
  gridOffsetTop: number,
): number | null {
  const scrollRect = scrollContainer.getBoundingClientRect();
  const yInContent = clientY - scrollRect.top + scrollContainer.scrollTop - gridOffsetTop;
  if (yInContent < 0 || yInContent > timelineTotalHeightPx()) return null;
  return TIMELINE_START_HOUR * 60 + (yInContent / TIMELINE_HOUR_HEIGHT_PX) * 60;
}

export const TIMELINE_DROP_HOLD_MS = 600;

export function timelineTotalHeightPx(): number {
  return (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * TIMELINE_HOUR_HEIGHT_PX;
}

export function minutesToTopPx(minutesFromMidnight: number): number {
  const offset = minutesFromMidnight - TIMELINE_START_HOUR * 60;
  return (offset / 60) * TIMELINE_HOUR_HEIGHT_PX;
}

export function minutesToHeightPx(durationMinutes: number): number {
  return Math.max((durationMinutes / 60) * TIMELINE_HOUR_HEIGHT_PX, 4);
}

export function entryBlockMetrics(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  durationMinutes: number | null | undefined,
): { topPx: number; heightPx: number } | null {
  if (!startAt) return null;

  const start = new Date(startAt);
  const startMinutes = start.getHours() * 60 + start.getMinutes();

  let duration = durationMinutes ?? 15;
  if (endAt) {
    const end = new Date(endAt);
    duration = Math.round((end.getTime() - start.getTime()) / 60000);
  }
  if (duration <= 0) duration = 15;

  return {
    topPx: minutesToTopPx(startMinutes),
    heightPx: minutesToHeightPx(duration),
  };
}

export type TimedEntryBlockLayout = {
  topPx: number;
  heightPx: number;
  column: number;
  columnCount: number;
};

type TimedEntryLike = {
  id: string;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number | null;
};

export function layoutTimedEntryBlocks(entries: TimedEntryLike[]): Map<string, TimedEntryBlockLayout> {
  const items = entries
    .map((entry) => {
      const range = entryToMinuteRange(entry.startAt, entry.endAt, entry.durationMinutes);
      const metrics = entryBlockMetrics(entry.startAt, entry.endAt, entry.durationMinutes);
      if (!range || !metrics) return null;
      return { id: entry.id, start: range.start, end: range.end, metrics };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const layouts = new Map<string, TimedEntryBlockLayout>();
  let cluster: typeof items = [];
  let clusterEnd = 0;

  function assignCluster(group: typeof items) {
    if (group.length === 0) return;

    const columnEnds: number[] = [];
    const assigned: Array<(typeof items)[number] & { column: number }> = [];

    for (const item of group) {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(item.end);
      } else {
        columnEnds[column] = item.end;
      }
      assigned.push({ ...item, column });
    }

    const columnCount = columnEnds.length;
    for (const item of assigned) {
      layouts.set(item.id, {
        topPx: item.metrics.topPx,
        heightPx: item.metrics.heightPx,
        column: item.column,
        columnCount,
      });
    }
  }

  for (const item of items) {
    if (cluster.length === 0 || item.start < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      assignCluster(cluster);
      cluster = [item];
      clusterEnd = item.end;
    }
  }
  assignCluster(cluster);

  return layouts;
}

const TIMELINE_ENTRY_INSET_PX = 4;
const TIMELINE_ENTRY_COLUMN_GAP_PX = 2;

export function timedEntryColumnStyle(
  column: number,
  columnCount: number,
): { left: string; width: string } {
  if (columnCount <= 1) {
    return {
      left: `${TIMELINE_ENTRY_INSET_PX}px`,
      width: `calc(100% - ${TIMELINE_ENTRY_INSET_PX * 2}px)`,
    };
  }

  const slice = `(100% - ${TIMELINE_ENTRY_INSET_PX * 2}px - ${(columnCount - 1) * TIMELINE_ENTRY_COLUMN_GAP_PX}px) / ${columnCount}`;
  return {
    left: `calc(${TIMELINE_ENTRY_INSET_PX}px + ${column} * (${slice} + ${TIMELINE_ENTRY_COLUMN_GAP_PX}px))`,
    width: `calc(${slice})`,
  };
}

export const TIMELINE_SNAP_MINUTES = 15;

export const TIMELINE_MINUTES_MIN = TIMELINE_START_HOUR * 60;
export const TIMELINE_MINUTES_MAX = TIMELINE_END_HOUR * 60;

export function snapTimelineMinutes(minutes: number): number {
  return Math.round(minutes / TIMELINE_SNAP_MINUTES) * TIMELINE_SNAP_MINUTES;
}

export function clampEntryMinuteRange(range: MinuteRange): MinuteRange | null {
  let start = snapTimelineMinutes(range.start);
  let end = snapTimelineMinutes(range.end);

  if (end - start < TIMELINE_MIN_ENTRY_MINUTES) {
    end = start + TIMELINE_MIN_ENTRY_MINUTES;
  }

  if (start < TIMELINE_MINUTES_MIN) {
    const shift = TIMELINE_MINUTES_MIN - start;
    start += shift;
    end += shift;
  }
  if (end > TIMELINE_MINUTES_MAX) {
    const shift = end - TIMELINE_MINUTES_MAX;
    start -= shift;
    end -= shift;
  }

  if (start < TIMELINE_MINUTES_MIN || end > TIMELINE_MINUTES_MAX) return null;
  if (end - start < TIMELINE_MIN_ENTRY_MINUTES) return null;
  return { start, end };
}

export function minuteRangeToIsoRange(
  dateStr: string,
  range: MinuteRange,
): { startAt: string; endAt: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  start.setMinutes(range.start);
  const end = new Date(y, m - 1, d, 0, 0, 0, 0);
  end.setMinutes(range.end);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function dropSlotToIsoRange(
  dateStr: string,
  slot: TimelineDropSlot,
): { startAt: string; endAt: string } {
  return minuteRangeToIsoRange(dateStr, {
    start: slot.startMinutes,
    end: slot.startMinutes + slot.durationMinutes,
  });
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatMinutesAsTime(minutesFromMidnight: number): string {
  const dt = new Date(2024, 0, 1, 0, 0, 0, 0);
  dt.setMinutes(minutesFromMidnight);
  return dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatMinuteRangeLabel(startMinutes: number, endMinutes: number): string {
  return `${formatMinutesAsTime(startMinutes)} – ${formatMinutesAsTime(endMinutes)}`;
}

export function formatSlotLabel(slot: TimelineDropSlot): string {
  return formatMinuteRangeLabel(slot.startMinutes, slot.startMinutes + slot.durationMinutes);
}


export function slotKey(slot: TimelineDropSlot): string {
  return `${slot.startMinutes}-${slot.durationMinutes}`;
}

export const TIMELINE_DROP_TIER_60_PX = 18;
export const TIMELINE_DROP_TIER_30_PX = 22;

export function formatSlotStart(slot: TimelineDropSlot): string {
  const start = new Date(2024, 0, 1, 0, 0, 0, 0);
  start.setMinutes(slot.startMinutes);
  return start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
