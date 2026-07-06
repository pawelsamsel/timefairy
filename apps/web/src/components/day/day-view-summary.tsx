import { Badge } from "@/components/ui/badge";
import type { ClientDayMinutes } from "@/lib/day-client-breakdown";
import { cn } from "@/lib/utils";

type DayViewSummaryProps = {
  totalMinutes: number;
  entryCount: number;
  filtersActive?: boolean;
  countBillableOnly?: boolean;
  allTotalMinutes?: number;
  clientBreakdown?: ClientDayMinutes[];
  className?: string;
};

function formatLoggedHours(totalMinutes: number): string {
  return `${(totalMinutes / 60).toFixed(2)} h`;
}

export function DayViewSummary({
  totalMinutes,
  entryCount,
  filtersActive = false,
  countBillableOnly = false,
  allTotalMinutes,
  clientBreakdown = [],
  className,
}: DayViewSummaryProps) {
  const entryLabel = entryCount === 1 ? "entry" : "entries";
  const showClientBreakdown = clientBreakdown.length > 0;
  const showSummaryMeta = filtersActive || countBillableOnly;

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col gap-2 rounded-md border bg-muted/30 px-4 py-2.5 text-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-lg font-semibold tabular-nums tracking-tight">
            {formatLoggedHours(totalMinutes)}
          </span>
          <span className="text-muted-foreground">
            {entryCount} {entryLabel}
          </span>
        </div>

        {showSummaryMeta && (
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {countBillableOnly && (
              <Badge variant="secondary" className="font-normal">
                Billable only
              </Badge>
            )}
            {filtersActive && (
              <Badge variant="secondary" className="font-normal">
                Filtered
              </Badge>
            )}
            {allTotalMinutes != null && allTotalMinutes !== totalMinutes && (
              <span className="text-xs tabular-nums">
                {formatLoggedHours(allTotalMinutes)} total this day
              </span>
            )}
          </div>
        )}
      </div>

      {showClientBreakdown && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/30 pt-2 text-xs text-muted-foreground">
          {clientBreakdown.map((row) => (
            <span key={row.clientId ?? "no-client"} className="tabular-nums">
              <span className="font-medium text-foreground/85">{row.clientName}</span>
              {" · "}
              {formatLoggedHours(row.totalMinutes)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
