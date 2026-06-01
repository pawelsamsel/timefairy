import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DayViewSummaryProps = {
  totalMinutes: number;
  entryCount: number;
  filtersActive?: boolean;
  allTotalMinutes?: number;
  className?: string;
};

function formatLoggedHours(totalMinutes: number): string {
  return `${(totalMinutes / 60).toFixed(2)} h`;
}

export function DayViewSummary({
  totalMinutes,
  entryCount,
  filtersActive = false,
  allTotalMinutes,
  className,
}: DayViewSummaryProps) {
  const entryLabel = entryCount === 1 ? "entry" : "entries";

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border bg-muted/30 px-4 py-2.5 text-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-lg font-semibold tabular-nums tracking-tight">
          {formatLoggedHours(totalMinutes)}
        </span>
        <span className="text-muted-foreground">
          {entryCount} {entryLabel}
        </span>
      </div>

      {filtersActive && (
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            Filtered
          </Badge>
          {allTotalMinutes != null && allTotalMinutes !== totalMinutes && (
            <span className="text-xs tabular-nums">
              {formatLoggedHours(allTotalMinutes)} total this day
            </span>
          )}
        </div>
      )}
    </div>
  );
}
