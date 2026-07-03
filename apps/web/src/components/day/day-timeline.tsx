import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Rows2, Rows3, Rows4 } from "lucide-react";
import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import { cn } from "@/lib/utils";
import { formatEntryTimePrefix } from "@/lib/datetime";
import { entryDisplayColor } from "@/lib/project-colors";
import { formatEntryLabel, formatEntryTooltipLines, type DayViewDisplayOptions } from "@/lib/entry-display";
import { isMomentEntry } from "@/lib/time-entry-kind";
import {
  clientYToTimelineMinute,
  entriesToOccupiedRanges,
  entryBlockMetrics,
  findFreeSegmentAtMinute,
  findFreeSegmentContainingMinute,
  formatHourLabel,
  formatMinuteRangeLabel,
  formatSlotLabel,
  getExpandedDropOptions,
  isMinuteNearMomentEntries,
  layoutTimedEntryBlocks,
  minutesToHeightPx,
  minutesToTopPx,
  momentEntryStartMinute,
  timedEntryColumnStyle,
  snapTimelineMinutes,
  type TimedEntryBlockLayout,
  slotKey,
  TIMELINE_DROP_HOLD_MS,
  TIMELINE_FREE_SLOT_HOVER_MS,
  TIMELINE_DEFAULT_SCROLL_HOUR,
  TIMELINE_END_HOUR,
  TIMELINE_HOUR_HEIGHT_PX,
  TIMELINE_START_HOUR,
  timelineTotalHeightPx,
  type TimelineDropSlot,
} from "@/lib/timeline";
import {
  isTaskDragEvent,
  parseTaskDragPayload,
  type TaskDragPayload,
} from "@/components/day/day-timeline-types";
import {
  useEntryScheduleDrag,
  type EntryScheduleChange,
} from "@/components/day/day-timeline-entry-interaction";
import { useTimelineCreateDrag } from "@/components/day/day-timeline-create-drag";
import { FreeSlotAddOverlay } from "@/components/day/day-timeline-free-slot";
import { Button } from "@/components/ui/button";
import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
import {
  resolveCompactHourHeightPx,
  TIMELINE_ZOOM_PRESETS,
  type TimelineZoomLevel,
} from "@/lib/timeline-zoom";

export type { TaskDragPayload } from "@/components/day/day-timeline-types";
export type { EntryScheduleChange } from "@/components/day/day-timeline-entry-interaction";

const TIMELINE_LABEL_OFFSET_PX = 2;
const TIMELINE_LABEL_PADDING_BOTTOM = 14;
const TIMELINE_FREE_SLOT_HOVER_ENABLED = false;

type DayTimelineProps = {
  className?: string;
  dateStr: string;
  entries: TimeEntryWithRelations[];
  display: DayViewDisplayOptions;
  clientNames: Map<string, string>;
  projectClientIds: Map<string, string>;
  isDraggingTask: boolean;
  onTaskDrop: (payload: TaskDragPayload, slot: TimelineDropSlot) => void;
  onEntryClick: (entry: TimeEntryWithRelations) => void;
  onEntryCopy: (entry: TimeEntryWithRelations) => void;
  onEntryScheduleChange: (change: EntryScheduleChange) => void;
  onFreeSlotClick: (slot: TimelineDropSlot, durationMinutes?: number) => void;
  gridStepMinutes?: number;
  minEntryMinutes?: number;
  useTimeGrid?: boolean;
  hourHeightPx?: number;
  zoomLevel?: TimelineZoomLevel;
  onZoomLevelChange?: (level: TimelineZoomLevel) => void;
};

export function DayTimeline({
  className,
  dateStr,
  entries,
  display,
  clientNames,
  projectClientIds,
  isDraggingTask,
  onTaskDrop,
  onEntryClick,
  onEntryCopy,
  onEntryScheduleChange,
  onFreeSlotClick,
  gridStepMinutes = 15,
  minEntryMinutes = 15,
  useTimeGrid = false,
  hourHeightPx = TIMELINE_HOUR_HEIGHT_PX,
  zoomLevel,
  onZoomLevelChange,
}: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const untimedSectionRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdHourRef = useRef<number | null>(null);
  const freeSlotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFreeSlotKeyRef = useRef<string | null>(null);

  const hourCount = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
  const isCompactFill = zoomLevel === 0;
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [untimedSectionHeight, setUntimedSectionHeight] = useState(0);

  const resolvedHourHeightPx = useMemo(() => {
    if (!isCompactFill || scrollViewportHeight <= 0) {
      return hourHeightPx;
    }
    const timelineAvailable = scrollViewportHeight - untimedSectionHeight;
    return resolveCompactHourHeightPx(
      timelineAvailable,
      hourCount,
      TIMELINE_LABEL_PADDING_BOTTOM,
    );
  }, [isCompactFill, scrollViewportHeight, untimedSectionHeight, hourHeightPx, hourCount]);

  const [highlightSlot, setHighlightSlot] = useState<TimelineDropSlot | null>(null);
  const [hoverFreeSlot, setHoverFreeSlot] = useState<TimelineDropSlot | null>(null);
  const [expandedHour, setExpandedHour] = useState<number | null>(null);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);

  const hours = Array.from(
    { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR },
    (_, i) => TIMELINE_START_HOUR + i,
  );

  const momentEntries = entries.filter(isMomentEntry);
  const timedEntries = entries.filter(
    (e) =>
      !isMomentEntry(e) &&
      entryBlockMetrics(e.startAt, e.endAt, e.durationMinutes, resolvedHourHeightPx) != null,
  );
  const untimedEntries = entries.filter(
    (e) =>
      !isMomentEntry(e) &&
      entryBlockMetrics(e.startAt, e.endAt, e.durationMinutes, resolvedHourHeightPx) == null,
  );
  const occupiedRanges = entriesToOccupiedRanges(timedEntries);
  const entryLayouts = useMemo(
    () => layoutTimedEntryBlocks(timedEntries, resolvedHourHeightPx),
    [timedEntries, resolvedHourHeightPx],
  );
  const momentStartMinutes = useMemo(
    () =>
      momentEntries
        .map((entry) => momentEntryStartMinute(entry.startAt))
        .filter((minute): minute is number => minute !== null),
    [momentEntries],
  );

  const now = new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  const isToday =
    y === now.getFullYear() && m === now.getMonth() + 1 && d === now.getDate();
  const nowTopPx = isToday
    ? minutesToTopPx(now.getHours() * 60 + now.getMinutes(), resolvedHourHeightPx)
    : null;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sync = () => setScrollViewportHeight(el.clientHeight);
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = untimedSectionRef.current;
    if (!el || untimedEntries.length === 0) {
      setUntimedSectionHeight(0);
      return;
    }
    const sync = () => setUntimedSectionHeight(el.offsetHeight);
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();
    return () => observer.disconnect();
  }, [untimedEntries.length]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (isCompactFill && scrollViewportHeight > 0) {
      scrollRef.current.scrollTop = 0;
      return;
    }
    const scrollTargetPx = minutesToTopPx(
      TIMELINE_DEFAULT_SCROLL_HOUR * 60,
      resolvedHourHeightPx,
    );
    scrollRef.current.scrollTop = Math.max(
      0,
      scrollTargetPx - scrollRef.current.clientHeight * 0.3,
    );
  }, [dateStr, resolvedHourHeightPx, isCompactFill, scrollViewportHeight]);

  useEffect(() => () => {
    clearHoldTimer();
    clearFreeSlotTimer();
  }, []);

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function clearFreeSlotTimer() {
    if (freeSlotTimerRef.current) {
      clearTimeout(freeSlotTimerRef.current);
      freeSlotTimerRef.current = null;
    }
    pendingFreeSlotKeyRef.current = null;
  }

  function dismissFreeSlotOverlay() {
    clearFreeSlotTimer();
    setHoverFreeSlot(null);
  }

  function resetDropUi() {
    clearHoldTimer();
    holdHourRef.current = null;
    setHighlightSlot(null);
    setExpandedHour(null);
    setActiveSlotKey(null);
  }

  function gridOffsetTop(): number {
    return gridRef.current?.offsetTop ?? 0;
  }

  function minuteFromEvent(e: React.DragEvent): number | null {
    if (!scrollRef.current) return null;
    return clientYToTimelineMinute(
      e.clientY,
      scrollRef.current,
      gridOffsetTop(),
      resolvedHourHeightPx,
    );
  }

  const minuteFromClientY = useCallback(
    (clientY: number) => {
      if (!scrollRef.current) return null;
      const raw = clientYToTimelineMinute(
        clientY,
        scrollRef.current,
        gridOffsetTop(),
        resolvedHourHeightPx,
      );
      if (raw === null) return null;
      return useTimeGrid ? snapTimelineMinutes(raw, gridStepMinutes) : raw;
    },
    [gridStepMinutes, resolvedHourHeightPx, useTimeGrid],
  );

  const snapMinuteFromClientY = useCallback(
    (clientY: number) => {
      if (!scrollRef.current) return null;
      const raw = clientYToTimelineMinute(
        clientY,
        scrollRef.current,
        gridOffsetTop(),
        resolvedHourHeightPx,
      );
      if (raw === null) return null;
      return snapTimelineMinutes(raw, gridStepMinutes);
    },
    [gridStepMinutes, resolvedHourHeightPx],
  );

  const handleCreateDrag = useCallback(
    (slot: TimelineDropSlot) => {
      dismissFreeSlotOverlay();
      onFreeSlotClick(slot);
    },
    [onFreeSlotClick],
  );

  const {
    preview: createPreview,
    startCreateDrag,
    cancelCreateDrag,
    isCreating,
  } = useTimelineCreateDrag({
    minuteFromClientY: snapMinuteFromClientY,
    occupiedRanges,
    momentStartMinutes,
    gridStepMinutes,
    minEntryMinutes,
    onCreate: handleCreateDrag,
  });

  const { preview: schedulePreview, startDrag, entryClickAllowed } = useEntryScheduleDrag({
    dateStr,
    minuteFromClientY,
    onScheduleChange: onEntryScheduleChange,
    gridStepMinutes,
    minEntryMinutes,
  });

  useEffect(() => {
    if (!isDraggingTask) {
      resetDropUi();
    } else {
      dismissFreeSlotOverlay();
      cancelCreateDrag();
    }
  }, [isDraggingTask, cancelCreateDrag]);

  useEffect(() => {
    if (schedulePreview) {
      dismissFreeSlotOverlay();
      cancelCreateDrag();
    }
  }, [schedulePreview, cancelCreateDrag]);

  const handleGridPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingTask || schedulePreview) return;

      const target = e.target as HTMLElement;
      if (
        target.closest("[data-free-slot-overlay]") ||
        target.closest("[data-moment-entry]") ||
        target.closest("[data-timeline-entry]")
      ) {
        return;
      }

      dismissFreeSlotOverlay();
      startCreateDrag(e);
    },
    [isDraggingTask, schedulePreview, startCreateDrag],
  );

  const handleGridPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!TIMELINE_FREE_SLOT_HOVER_ENABLED) return;

      if (isDraggingTask || schedulePreview || isCreating) {
        dismissFreeSlotOverlay();
        return;
      }

      const target = e.target as HTMLElement;
      if (target.closest("[data-free-slot-overlay]") || target.closest("[data-moment-entry]")) {
        return;
      }

      const minute = minuteFromClientY(e.clientY);
      if (minute === null) {
        dismissFreeSlotOverlay();
        return;
      }

      if (isMinuteNearMomentEntries(minute, momentStartMinutes)) {
        dismissFreeSlotOverlay();
        return;
      }

      const segment = findFreeSegmentContainingMinute(minute, occupiedRanges);
      if (!segment) {
        dismissFreeSlotOverlay();
        return;
      }

      const key = slotKey(segment);
      if (hoverFreeSlot && slotKey(hoverFreeSlot) === key) return;
      if (pendingFreeSlotKeyRef.current === key) return;

      clearFreeSlotTimer();
      pendingFreeSlotKeyRef.current = key;
      freeSlotTimerRef.current = setTimeout(() => {
        setHoverFreeSlot(segment);
        pendingFreeSlotKeyRef.current = null;
        freeSlotTimerRef.current = null;
      }, TIMELINE_FREE_SLOT_HOVER_MS);
    },
    [
      hoverFreeSlot,
      isDraggingTask,
      minuteFromClientY,
      momentStartMinutes,
      occupiedRanges,
      schedulePreview,
      isCreating,
    ],
  );

  function scheduleExpand(hour: number) {
    clearHoldTimer();
    holdTimerRef.current = setTimeout(() => {
      setExpandedHour(hour);
    }, TIMELINE_DROP_HOLD_MS);
  }

  function handleGridDragOver(e: React.DragEvent) {
    if (!isDraggingTask && !isTaskDragEvent(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";

    const minute = minuteFromEvent(e);
    if (minute === null) return;

    const hour = Math.floor(minute / 60);
    const segment = findFreeSegmentAtMinute(minute, occupiedRanges);
    setHighlightSlot(segment);

    if (holdHourRef.current !== hour) {
      holdHourRef.current = hour;
      setExpandedHour(null);
      setActiveSlotKey(null);
      scheduleExpand(hour);
    }
  }

  function handleGridDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const payload = parseTaskDragPayload(e.dataTransfer);
    if (!payload) return;

    const options =
      expandedHour !== null
        ? getExpandedDropOptions(expandedHour, occupiedRanges, gridStepMinutes, useTimeGrid)
        : [];

    const slot =
      activeSlotKey != null
        ? options.find((s) => slotKey(s) === activeSlotKey) ?? highlightSlot
        : highlightSlot;

    if (!slot) return;
    onTaskDrop(payload, slot);
    resetDropUi();
  }

  function handleSlotChipDragOver(e: React.DragEvent, slot: TimelineDropSlot) {
    if (!isDraggingTask && !isTaskDragEvent(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setActiveSlotKey(slotKey(slot));
    setHighlightSlot(slot);
  }

  const expandedOptions =
    expandedHour !== null
      ? getExpandedDropOptions(expandedHour, occupiedRanges, gridStepMinutes, useTimeGrid)
      : [];

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 overflow-hidden rounded-md border bg-card shadow-sm",
        className,
      )}
    >
      {zoomLevel != null && onZoomLevelChange ? (
        <TimelineZoomToggle zoomLevel={zoomLevel} onZoomLevelChange={onZoomLevelChange} />
      ) : null}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div
          className="relative"
          style={{
            minHeight: timelineTotalHeightPx(resolvedHourHeightPx) + TIMELINE_LABEL_PADDING_BOTTOM,
          }}
        >
          <div className="relative" style={{ height: timelineTotalHeightPx(resolvedHourHeightPx) }}>
            {hours.map((hour) => (
              <div
                key={`gutter-${hour}`}
                className="pointer-events-none absolute left-0 w-14 border-b border-border/30 bg-muted/20"
                style={{
                  top: (hour - TIMELINE_START_HOUR) * resolvedHourHeightPx,
                  height: resolvedHourHeightPx,
                }}
              />
            ))}

            {hours.map((hour) => (
              <div
                key={`label-${hour}`}
                className="pointer-events-none absolute left-0 z-10 w-14 pr-2 text-right text-[11px] leading-none tabular-nums text-muted-foreground"
                style={{
                  top: (hour - TIMELINE_START_HOUR) * resolvedHourHeightPx,
                  transform: `translateY(${TIMELINE_LABEL_OFFSET_PX}px)`,
                }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}

            <div
              className="pointer-events-none absolute left-0 z-10 w-14 pr-2 text-right text-[11px] leading-none tabular-nums text-muted-foreground"
              style={{
                top: timelineTotalHeightPx(resolvedHourHeightPx),
                transform: `translateY(${TIMELINE_LABEL_OFFSET_PX}px)`,
              }}
            >
              {formatHourLabel(TIMELINE_END_HOUR)}
            </div>

            <div
              ref={gridRef}
              className={cn(
                "relative ml-14",
                !isDraggingTask && !schedulePreview && !isCreating && "cursor-crosshair",
              )}
              style={{ height: timelineTotalHeightPx(resolvedHourHeightPx) }}
              onPointerDown={handleGridPointerDown}
              onPointerMove={TIMELINE_FREE_SLOT_HOVER_ENABLED ? handleGridPointerMove : undefined}
              onPointerLeave={TIMELINE_FREE_SLOT_HOVER_ENABLED ? dismissFreeSlotOverlay : undefined}
              onDragLeave={(e) => {
              const next = e.relatedTarget as Node | null;
              if (next && e.currentTarget.contains(next)) return;
              if (isDraggingTask) resetDropUi();
            }}
            onDragOver={isDraggingTask ? handleGridDragOver : undefined}
            onDrop={isDraggingTask ? handleGridDrop : undefined}
          >
            {hours.map((hour) => (
              <div
                key={`row-${hour}`}
                className="pointer-events-none absolute left-0 right-0 border-b border-border/30"
                style={{
                  top: (hour - TIMELINE_START_HOUR) * resolvedHourHeightPx,
                  height: resolvedHourHeightPx,
                }}
              />
            ))}

            {gridStepMinutes < 60 &&
              hours.flatMap((hour) =>
                Array.from({ length: Math.floor(60 / gridStepMinutes) - 1 }, (_, index) => {
                  const offset = (index + 1) * gridStepMinutes;
                  const topMinutes = hour * 60 + offset;
                  return (
                    <div
                      key={`grid-${hour}-${offset}`}
                      className="pointer-events-none absolute left-0 right-0 border-b border-border/15"
                      style={{
                        top: minutesToTopPx(topMinutes, resolvedHourHeightPx),
                        height: 0,
                      }}
                    />
                  );
                }),
              )}

            {createPreview && (
              <div
                className="pointer-events-none absolute left-1 right-2 z-20 rounded-md border-2 border-dashed border-primary bg-primary/20"
                style={{
                  top: minutesToTopPx(createPreview.start, resolvedHourHeightPx),
                  height: minutesToHeightPx(
                    createPreview.end - createPreview.start,
                    resolvedHourHeightPx,
                  ),
                }}
              >
                <span className="absolute left-2 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-primary shadow-sm">
                  {formatMinuteRangeLabel(createPreview.start, createPreview.end)}
                </span>
              </div>
            )}

            {highlightSlot && isDraggingTask && (
              <div
                className="pointer-events-none absolute left-1 right-2 z-20 rounded-md border-2 border-dashed border-primary bg-primary/15"
                style={{
                  top: minutesToTopPx(highlightSlot.startMinutes, resolvedHourHeightPx),
                  height: minutesToHeightPx(highlightSlot.durationMinutes, resolvedHourHeightPx),
                }}
              >
                <span className="absolute left-2 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-primary shadow-sm">
                  {formatSlotLabel(highlightSlot)}
                </span>
              </div>
            )}

            {expandedHour !== null && expandedOptions.length > 0 && isDraggingTask && (
              <div
                className="absolute left-2 right-2 z-40 rounded-md border border-primary/40 bg-background p-2 shadow-xl"
                style={{
                  top: (expandedHour - TIMELINE_START_HOUR) * resolvedHourHeightPx + 4,
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <p className="mb-2 text-[10px] font-medium text-muted-foreground">
                  Hold release — pick a shorter slot or drop outside for full block
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {expandedOptions.map((slot) => {
                    const key = slotKey(slot);
                    const active = activeSlotKey === key;
                    const isFullBlock =
                      highlightSlot != null &&
                      key === slotKey(highlightSlot) &&
                      slot.durationMinutes === highlightSlot.durationMinutes;
                    return (
                      <div
                        key={key}
                        className={cn(
                          "cursor-copy rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-primary/25 bg-primary/10 text-primary hover:bg-primary/20",
                          isFullBlock && !active && "ring-1 ring-primary/30",
                        )}
                        onDragEnter={(e) => handleSlotChipDragOver(e, slot)}
                        onDragOver={(e) => handleSlotChipDragOver(e, slot)}
                        onDrop={handleGridDrop}
                      >
                        {formatSlotLabel(slot)}
                        <span className="ml-1 opacity-70">({slot.durationMinutes}m)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {TIMELINE_FREE_SLOT_HOVER_ENABLED &&
              hoverFreeSlot &&
              !isDraggingTask &&
              !schedulePreview &&
              !isCreating && (
              <FreeSlotAddOverlay
                slot={hoverFreeSlot}
                minEntryMinutes={minEntryMinutes}
                gridStepMinutes={gridStepMinutes}
                hourHeightPx={resolvedHourHeightPx}
                onDismiss={dismissFreeSlotOverlay}
                onSelect={(slot, durationMinutes) => {
                  dismissFreeSlotOverlay();
                  onFreeSlotClick(slot, durationMinutes);
                }}
              />
            )}

            {momentEntries.map((entry) => (
              <MomentEntryMarker
                key={entry.id}
                entry={entry}
                hourHeightPx={resolvedHourHeightPx}
                display={display}
                clientNames={clientNames}
                projectClientIds={projectClientIds}
                dimmed={isDraggingTask}
                onDismissOverlay={dismissFreeSlotOverlay}
                onClick={() => {
                  if (entryClickAllowed()) onEntryClick(entry);
                }}
              />
            ))}

            {timedEntries.map((entry) => {
              const layout = entryLayouts.get(entry.id);
              if (!layout) return null;
              const previewRange =
                schedulePreview?.entryId === entry.id ? schedulePreview.range : null;
              return (
                <TimelineEntryBlock
                  key={entry.id}
                  entry={entry}
                  layout={layout}
                  previewRange={previewRange}
                  hourHeightPx={resolvedHourHeightPx}
                  display={display}
                  clientNames={clientNames}
                  projectClientIds={projectClientIds}
                  dimmed={isDraggingTask}
                  isRescheduling={schedulePreview?.entryId === entry.id}
                  onStartDrag={startDrag}
                  onClick={() => {
                    if (entryClickAllowed()) onEntryClick(entry);
                  }}
                  onCopy={() => onEntryCopy(entry)}
                />
              );
            })}

            {nowTopPx !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                style={{ top: nowTopPx }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm" />
                <div className="h-0.5 flex-1 bg-primary" />
              </div>
            )}
          </div>
        </div>
        </div>

        {untimedEntries.length > 0 && (
          <div ref={untimedSectionRef} className="ml-14 border-t bg-muted/10 px-3 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Without start time</p>
            <div className="space-y-1">
              {untimedEntries.map((entry) => (
                <UntimedEntryRow
                  key={entry.id}
                  entry={entry}
                  display={display}
                  clientNames={clientNames}
                  projectClientIds={projectClientIds}
                  onClick={() => onEntryClick(entry)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TIMELINE_ZOOM_ICONS = [Rows2, Rows3, Rows4] as const;

function TimelineZoomToggle({
  zoomLevel,
  onZoomLevelChange,
}: {
  zoomLevel: TimelineZoomLevel;
  onZoomLevelChange: (level: TimelineZoomLevel) => void;
}) {
  return (
    <div className="absolute right-4 top-2 z-30 flex gap-0.5 rounded-md border border-border/60 bg-card p-0.5 shadow-sm">
      {TIMELINE_ZOOM_PRESETS.map((preset) => {
        const Icon = TIMELINE_ZOOM_ICONS[preset.level];
        return (
          <DelayedTooltip key={preset.level} label={preset.description}>
            <Button
              type="button"
              size="icon"
              variant={zoomLevel === preset.level ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => onZoomLevelChange(preset.level)}
              aria-pressed={zoomLevel === preset.level}
              aria-label={preset.label}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          </DelayedTooltip>
        );
      })}
    </div>
  );
}

function MomentEntryMarker({
  entry,
  hourHeightPx,
  display,
  clientNames,
  projectClientIds,
  dimmed,
  onDismissOverlay,
  onClick,
}: {
  entry: TimeEntryWithRelations;
  hourHeightPx: number;
  display: DayViewDisplayOptions;
  clientNames: Map<string, string>;
  projectClientIds: Map<string, string>;
  dimmed?: boolean;
  onDismissOverlay?: () => void;
  onClick: () => void;
}) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const tooltipTimerRef = useRef<number | null>(null);

  const clearTooltipTimer = useCallback(() => {
    if (tooltipTimerRef.current != null) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    clearTooltipTimer();
    setTooltipPos(null);
  }, [clearTooltipTimer]);

  const showTooltipAt = useCallback(
    (x: number, y: number) => {
      clearTooltipTimer();
      setTooltipPos({ x, y });
    },
    [clearTooltipTimer],
  );

  const scheduleTooltip = useCallback(
    (x: number, y: number) => {
      clearTooltipTimer();
      tooltipTimerRef.current = window.setTimeout(() => {
        setTooltipPos({ x, y });
        tooltipTimerRef.current = null;
      }, 200);
    },
    [clearTooltipTimer],
  );

  useEffect(() => () => clearTooltipTimer(), [clearTooltipTimer]);

  if (!entry.startAt) return null;

  const start = new Date(entry.startAt);
  const topPx = minutesToTopPx(start.getHours() * 60 + start.getMinutes(), hourHeightPx);
  const color = entryDisplayColor(entry);
  const timePrefix = formatEntryTimePrefix(entry.startAt, null, null);
  const label = formatEntryLabel(entry, display, clientNames, projectClientIds, timePrefix);
  const tooltipLines = formatEntryTooltipLines(
    entry,
    clientNames,
    projectClientIds,
    timePrefix,
  );

  return (
    <>
      <button
        type="button"
        data-moment-entry
        onClick={onClick}
        onPointerEnter={() => onDismissOverlay?.()}
        onMouseEnter={(e) => scheduleTooltip(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (tooltipPos) showTooltipAt(e.clientX, e.clientY);
        }}
        onMouseLeave={hideTooltip}
        className={cn(
          "absolute left-14 right-2 z-[25] flex cursor-pointer items-center gap-2 rounded-md border bg-background/95 px-2 py-1 text-left shadow-sm hover:border-primary/40 hover:bg-muted/50",
          dimmed && "pointer-events-none opacity-60",
        )}
        style={{ top: topPx - 12 }}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rotate-45 rounded-sm"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span>
      </button>
      {tooltipPos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] max-w-xs rounded-md border border-border bg-popover px-2.5 py-2 text-popover-foreground shadow-lg"
            style={{
              left: tooltipPos.x + ENTRY_TOOLTIP_OFFSET,
              top: tooltipPos.y + ENTRY_TOOLTIP_OFFSET,
            }}
          >
            <div className="space-y-0.5 text-xs leading-snug">
              {tooltipLines.map((line, index) => (
                <div key={index} className={cn(index === 0 && "font-medium text-foreground")}>
                  {line}
                </div>
              ))}
              <div className="pt-0.5 text-[10px] text-muted-foreground">Click to edit</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

const ENTRY_TOOLTIP_OFFSET = 12;
const COMPACT_ENTRY_HEIGHT_PX = 20;

function TimelineEntryBlock({
  entry,
  layout,
  previewRange,
  hourHeightPx,
  display,
  clientNames,
  projectClientIds,
  dimmed,
  isRescheduling,
  onStartDrag,
  onClick,
  onCopy,
}: {
  entry: TimeEntryWithRelations;
  layout: TimedEntryBlockLayout;
  previewRange: { start: number; end: number } | null;
  hourHeightPx: number;
  display: DayViewDisplayOptions;
  clientNames: Map<string, string>;
  projectClientIds: Map<string, string>;
  dimmed?: boolean;
  isRescheduling?: boolean;
  onStartDrag: (
    e: React.PointerEvent,
    entry: TimeEntryWithRelations,
    mode: "move" | "resize-start" | "resize-end",
  ) => void;
  onClick: () => void;
  onCopy: () => void;
}) {
  const color = entryDisplayColor(entry);
  const columnStyle = timedEntryColumnStyle(layout.column, layout.columnCount);
  const timePrefix = previewRange
    ? formatMinuteRangeLabel(previewRange.start, previewRange.end)
    : formatEntryTimePrefix(entry.startAt, entry.endAt, entry.durationMinutes);
  const label = formatEntryLabel(
    entry,
    display,
    clientNames,
    projectClientIds,
    timePrefix,
  );
  const topPx = previewRange ? minutesToTopPx(previewRange.start, hourHeightPx) : layout.topPx;
  const heightPx = previewRange
    ? minutesToHeightPx(previewRange.end - previewRange.start, hourHeightPx)
    : layout.heightPx;
  const handlesDisabled = dimmed || !entry.startAt;
  const isCompact = heightPx <= COMPACT_ENTRY_HEIGHT_PX;
  const tooltipLines = formatEntryTooltipLines(
    entry,
    clientNames,
    projectClientIds,
    timePrefix,
  );
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const tooltipTimerRef = useRef<number | null>(null);

  const clearTooltipTimer = useCallback(() => {
    if (tooltipTimerRef.current != null) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    clearTooltipTimer();
    setTooltipPos(null);
  }, [clearTooltipTimer]);

  const showTooltipAt = useCallback(
    (x: number, y: number) => {
      clearTooltipTimer();
      setTooltipPos({ x, y });
    },
    [clearTooltipTimer],
  );

  const scheduleTooltip = useCallback(
    (x: number, y: number) => {
      clearTooltipTimer();
      const delay = isCompact ? 0 : 250;
      if (delay === 0) {
        setTooltipPos({ x, y });
        return;
      }
      tooltipTimerRef.current = window.setTimeout(() => {
        setTooltipPos({ x, y });
        tooltipTimerRef.current = null;
      }, delay);
    },
    [clearTooltipTimer, isCompact],
  );

  useEffect(() => () => clearTooltipTimer(), [clearTooltipTimer]);

  useEffect(() => {
    if (isRescheduling || handlesDisabled) hideTooltip();
  }, [isRescheduling, handlesDisabled, hideTooltip]);

  return (
    <>
    <div
      data-timeline-entry
      className={cn(
        "group/entry absolute z-10 overflow-hidden rounded-sm border border-white/20 text-left text-xs text-white shadow-sm",
        layout.columnCount > 1 && "text-[11px]",
        dimmed ? "pointer-events-none opacity-75" : "opacity-100",
        isRescheduling && "z-30 ring-2 ring-white/50",
      )}
      style={{
        top: topPx,
        height: heightPx,
        left: columnStyle.left,
        width: columnStyle.width,
        backgroundColor: color,
      }}
    >
      {!handlesDisabled && (
        <>
          <button
            type="button"
            aria-label="Copy entry"
            className="absolute right-0.5 top-0.5 z-30 rounded p-0.5 text-white/90 opacity-0 transition-opacity hover:bg-white/20 group-hover/entry:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Resize start"
            className="absolute left-1/2 top-0 z-30 flex h-3 w-10 -translate-x-1/2 cursor-ns-resize items-start justify-center opacity-0 transition-opacity group-hover/entry:opacity-100"
            onPointerDown={(e) => onStartDrag(e, entry, "resize-start")}
            onMouseEnter={hideTooltip}
          >
            <span className="mt-0.5 h-1 w-8 rounded-full bg-white/70 shadow-sm" />
          </button>
          <button
            type="button"
            aria-label="Resize end"
            className="absolute bottom-0 left-1/2 z-30 flex h-3 w-10 -translate-x-1/2 cursor-ns-resize items-end justify-center opacity-0 transition-opacity group-hover/entry:opacity-100"
            onPointerDown={(e) => onStartDrag(e, entry, "resize-end")}
            onMouseEnter={hideTooltip}
          >
            <span className="mb-0.5 h-1 w-8 rounded-full bg-white/70 shadow-sm" />
          </button>
          <button
            type="button"
            aria-label="Move entry"
            className="absolute bottom-2 left-0 top-2 z-30 flex w-3 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover/entry:opacity-100 active:cursor-grabbing"
            onPointerDown={(e) => onStartDrag(e, entry, "move")}
            onMouseEnter={hideTooltip}
          >
            <span className="h-6 w-1 rounded-full bg-white/70 shadow-sm" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-full w-full cursor-default flex-col items-start justify-start px-1.5 pt-1 pb-0.5 text-left hover:opacity-90",
          layout.columnCount > 1 && "px-1 pt-0.5",
          !handlesDisabled && "pl-3.5",
        )}
        onMouseEnter={(e) => scheduleTooltip(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (tooltipPos) showTooltipAt(e.clientX, e.clientY);
        }}
        onMouseLeave={hideTooltip}
      >
        <div className="truncate font-medium leading-tight">{label}</div>
      </button>
    </div>
    {tooltipPos &&
      createPortal(
        <div
          className="pointer-events-none fixed z-[100] max-w-xs rounded-md border border-border bg-popover px-2.5 py-2 text-popover-foreground shadow-lg"
          style={{
            left: tooltipPos.x + ENTRY_TOOLTIP_OFFSET,
            top: tooltipPos.y + ENTRY_TOOLTIP_OFFSET,
          }}
        >
          <div className="space-y-0.5 text-xs leading-snug">
            {tooltipLines.map((line, index) => (
              <div key={index} className={cn(index === 0 && "font-medium text-foreground")}>
                {line}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function UntimedEntryRow({
  entry,
  display,
  clientNames,
  projectClientIds,
  onClick,
}: {
  entry: TimeEntryWithRelations;
  display: DayViewDisplayOptions;
  clientNames: Map<string, string>;
  projectClientIds: Map<string, string>;
  onClick: () => void;
}) {
  const label = formatEntryLabel(entry, display, clientNames, projectClientIds);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left text-xs hover:bg-muted/40"
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: entry.lane?.color ?? "var(--color-steel-azure)" }}
      />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {entry.durationMinutes != null && (
        <span className="shrink-0 text-muted-foreground">{(entry.durationMinutes / 60).toFixed(2)}h</span>
      )}
    </button>
  );
}
