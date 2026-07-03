import { Plus } from "lucide-react";
import {
  formatSlotLabel,
  minutesToHeightPx,
  minutesToTopPx,
  slotDefaultDurationMinutes,
  type TimelineDropSlot,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

type FreeSlotAddOverlayProps = {
  slot: TimelineDropSlot;
  minEntryMinutes?: number;
  gridStepMinutes?: number;
  onSelect: (slot: TimelineDropSlot, durationMinutes?: number) => void;
  onDismiss?: () => void;
};

export function FreeSlotAddOverlay({
  slot,
  minEntryMinutes = 15,
  gridStepMinutes = 15,
  onSelect,
  onDismiss,
}: FreeSlotAddOverlayProps) {
  const heightPx = minutesToHeightPx(slot.durationMinutes);
  const compact = heightPx < 36;
  const quickDurations = buildQuickDurations(slot, gridStepMinutes);
  const showQuickDurations = quickDurations.length > 1;

  return (
    <div
      data-free-slot-overlay
      className="group/free-slot absolute left-1 right-2 z-[12]"
      style={{
        top: minutesToTopPx(slot.startMinutes),
        height: heightPx,
      }}
      onPointerLeave={(e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) {
          onDismiss?.();
        }
      }}
    >
      <div
        className={cn(
          "flex h-full w-full items-center rounded-md border border-dashed border-primary/40 bg-primary/5 text-primary transition-colors",
          "hover:border-primary hover:bg-primary/15",
          compact ? "gap-1 px-1" : "gap-2 px-2",
        )}
      >
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-1 cursor-pointer items-center justify-center text-primary transition-colors hover:text-primary",
            compact ? "gap-1" : "flex-col gap-0.5",
          )}
          onClick={() => onSelect(slot)}
        >
          <Plus className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          {!compact && <span className="text-[10px] font-medium leading-tight">Add entry</span>}
          {!compact && (
            <span className="text-[9px] leading-tight text-primary/80">
              {formatSlotLabel({
                startMinutes: slot.startMinutes,
                durationMinutes: slotDefaultDurationMinutes(slot, minEntryMinutes),
              })}
            </span>
          )}
        </button>

        {showQuickDurations && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-0.5",
              compact
                ? "opacity-100"
                : "opacity-0 transition-opacity group-hover/free-slot:opacity-100",
            )}
          >
            {quickDurations.map((duration) => (
              <button
                key={duration}
                type="button"
                className="cursor-pointer rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium leading-none text-primary transition-colors hover:border-primary/50 hover:bg-primary/25"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(slot, duration);
                }}
              >
                {duration}m
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildQuickDurations(slot: TimelineDropSlot, gridStepMinutes: number): number[] {
  if (slot.durationMinutes < gridStepMinutes * 2) return [];

  const candidates = [gridStepMinutes, gridStepMinutes * 2, gridStepMinutes * 3, 60, slot.durationMinutes];
  const seen = new Set<number>();
  const result: number[] = [];

  for (const duration of candidates) {
    if (duration < gridStepMinutes || duration > slot.durationMinutes || seen.has(duration)) continue;
    seen.add(duration);
    result.push(duration);
  }

  return result.slice(0, 4);
}
