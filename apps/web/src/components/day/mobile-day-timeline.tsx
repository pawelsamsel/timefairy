import { Plus } from "lucide-react";
import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import {
  buildMobileDayTimelineRows,
  formatGapSlotLabel,
  formatMinuteRangeLabel,
  formatMinutesLabel,
  fullDayGapSlot,
  isEmptyMobileDayTimeline,
  type MobileGapClickPayload,
  type MobileTimelineRow,
} from "@/lib/mobile-day-timeline";
import { entryDisplayColor } from "@/lib/project-colors";
import {
  entryHasSupplementaryNote,
  formatEntryLabel,
  type DayViewDisplayOptions,
} from "@/lib/entry-display";
import { isMomentEntry } from "@/lib/time-entry-kind";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type MobileDayTimelineProps = {
  className?: string;
  dateStr: string;
  entries: TimeEntryWithRelations[];
  display: DayViewDisplayOptions;
  clientNames: Map<string, string>;
  projectClientIds: Map<string, string>;
  onEntryClick: (entry: TimeEntryWithRelations) => void;
  onGapClick: (payload: MobileGapClickPayload) => void;
};

export function MobileDayTimeline({
  className,
  dateStr,
  entries,
  display,
  clientNames,
  projectClientIds,
  onEntryClick,
  onGapClick,
}: MobileDayTimelineProps) {
  const rows = buildMobileDayTimelineRows(entries, dateStr);
  const isEmptyDay = isEmptyMobileDayTimeline(rows);
  const untimedEntries = entries.filter(
    (entry) => !entry.startAt && !isMomentEntry(entry),
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border bg-card shadow-sm", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4 pt-0">
        <div className="relative mx-auto flex w-full max-w-lg flex-col">
          {isEmptyDay ? (
            <EmptyDayTimeline onGapClick={onGapClick} />
          ) : (
            <div className="space-y-0">
              {rows.map((row, index) => (
                <MobileTimelineRowView
                  key={rowKey(row, index)}
                  row={row}
                  display={display}
                  clientNames={clientNames}
                  projectClientIds={projectClientIds}
                  isFirst={index === 0}
                  isLast={index === rows.length - 1}
                  onEntryClick={onEntryClick}
                  onGapClick={onGapClick}
                />
              ))}
            </div>
          )}
        </div>

        {untimedEntries.length > 0 && (
          <div className="mx-auto mt-6 w-full max-w-lg border-t border-border/40 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Without start time
            </p>
            <div className="space-y-2">
              {untimedEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onEntryClick(entry)}
                  className="flex w-full gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-muted/30"
                >
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: entryDisplayColor(entry) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {formatEntryLabel(entry, display, clientNames, projectClientIds)}
                    </div>
                    {entry.durationMinutes ? (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {(entry.durationMinutes / 60).toFixed(2)} h
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineRailSegment({ className }: { className?: string }) {
  return <div className={cn("w-0.5 shrink-0 bg-border/80", className)} aria-hidden />;
}

function EmptyDayTimeline({
  onGapClick,
}: {
  onGapClick: (payload: MobileGapClickPayload) => void;
}) {
  const slot = fullDayGapSlot();

  return (
    <div className="flex flex-col items-center">
      <TimelineRailSegment className="h-6" />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 rounded-full border-dashed bg-background shadow-sm"
        onClick={() => onGapClick({ slot })}
        aria-label={`Add in ${formatGapSlotLabel(slot)}`}
        title={formatGapSlotLabel(slot)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function rowKey(row: MobileTimelineRow, index: number): string {
  if (row.type === "gap") {
    return `gap-${row.slot.startMinutes}-${row.slot.durationMinutes}-${index}`;
  }
  return `${row.type}-${row.entry.id}-${index}`;
}

function MobileTimelineRowView({
  row,
  display,
  clientNames,
  projectClientIds,
  isFirst,
  isLast,
  onEntryClick,
  onGapClick,
}: {
  row: MobileTimelineRow;
  display: DayViewDisplayOptions;
  clientNames: Map<string, string>;
  projectClientIds: Map<string, string>;
  isFirst: boolean;
  isLast: boolean;
  onEntryClick: (entry: TimeEntryWithRelations) => void;
  onGapClick: (payload: MobileGapClickPayload) => void;
}) {
  if (row.type === "gap") {
    return (
      <div className="flex flex-col items-center">
        <TimelineRailSegment className="h-3" />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="relative z-10 h-9 w-9 rounded-full border-dashed bg-background shadow-sm"
          onClick={() => onGapClick({ slot: row.slot, dockSide: row.dockSide })}
          aria-label={`Add in ${formatGapSlotLabel(row.slot)}`}
          title={formatGapSlotLabel(row.slot)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {!isLast ? <TimelineRailSegment className="h-3" /> : null}
      </div>
    );
  }

  if (row.type === "moment") {
    const label = formatEntryLabel(row.entry, display, clientNames, projectClientIds);
    const showNote = entryHasSupplementaryNote(row.entry);

    return (
      <div className="flex w-full flex-col items-center">
        {!isFirst ? <TimelineRailSegment className="h-2" /> : null}
        <button
          type="button"
          onClick={() => onEntryClick(row.entry)}
          className="relative z-0 w-full rounded-lg border border-border/50 bg-card px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-muted/30"
        >
          <div className="text-xs font-medium tabular-nums text-muted-foreground">
            {formatMinutesLabel(row.startMinutes)}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">{label}</div>
          <div className="mt-1 text-xs text-muted-foreground">Event</div>
          {showNote && row.entry.note ? (
            <div className="mt-1 line-clamp-2 text-xs text-foreground/80">{row.entry.note}</div>
          ) : null}
        </button>
        {!isLast ? <TimelineRailSegment className="h-2" /> : null}
      </div>
    );
  }

  const label = formatEntryLabel(row.entry, display, clientNames, projectClientIds);
  const showNote = entryHasSupplementaryNote(row.entry);
  const durationMinutes = row.range.end - row.range.start;

  return (
    <div className="flex w-full flex-col items-center">
      {!isFirst ? <TimelineRailSegment className="h-2" /> : null}
      <button
        type="button"
        onClick={() => onEntryClick(row.entry)}
        className="relative z-0 flex w-full overflow-hidden rounded-lg border border-border/50 bg-card text-left shadow-sm transition-colors hover:bg-muted/30"
      >
        <div
          className="w-1.5 shrink-0 self-stretch"
          style={{ backgroundColor: entryDisplayColor(row.entry) }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {formatMinuteRangeLabel(row.range.start, row.range.end)}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {(durationMinutes / 60).toFixed(2)} h
              </span>
            </div>
            {row.entry.lane?.name ? (
              <span className="shrink-0 text-xs text-muted-foreground">{row.entry.lane.name}</span>
            ) : null}
          </div>
          <div className="mt-1 truncate text-sm font-semibold">{label}</div>
          {showNote && row.entry.note ? (
            <div className="mt-1 line-clamp-2 text-xs text-foreground/80">{row.entry.note}</div>
          ) : null}
        </div>
      </button>
      {!isLast ? <TimelineRailSegment className="h-2" /> : null}
    </div>
  );
}
