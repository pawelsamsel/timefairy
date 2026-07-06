import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { WorkHoursPreferences } from "@timefairy/shared-types";
import { isWeekend, type DayLogStatus, type DayLogSummary } from "@/lib/month-calendar";
import { type DayLogDayState } from "@/lib/day-logs";
import { resolveDayStatus } from "@/lib/work-hours";
import { useIsMobileLayout } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LABELS_COMPACT = ["M", "T", "W", "T", "F", "S", "S"];

const DAY_OFF_HATCH =
  "[background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.07)_3px,rgba(0,0,0,0.07)_4px)]";

type MonthCalendarProps = {
  year?: number;
  monthIndex: number;
  gridDates: string[];
  daySummaries: Map<string, DayLogSummary>;
  workHoursPreferences: WorkHoursPreferences;
  selectedDate?: string;
  compact?: boolean;
  showLegend?: boolean;
  onDateSelect?: (date: string) => void;
  dayLogsByDate?: Map<string, DayLogDayState>;
};

function formatHours(totalMinutes: number, compact: boolean): string {
  const hours = totalMinutes / 60;
  return compact ? hours.toFixed(2) : `${hours.toFixed(1)}h`;
}

function statusClasses(status: DayLogStatus, inMonth: boolean, compact: boolean): string {
  if (!inMonth) return "text-muted-foreground/40 bg-transparent border-transparent";
  switch (status) {
    case "met":
      return compact
        ? "border-emerald-500/50 bg-emerald-500/20 hover:bg-emerald-500/30"
        : "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15";
    case "below":
      return compact
        ? "border-amber-500/50 bg-amber-500/20 hover:bg-amber-500/30"
        : "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15";
    case "off":
      return compact
        ? "border-border/50 bg-muted/10 text-muted-foreground/60 hover:bg-muted/20"
        : "border-border/50 bg-muted/10 text-muted-foreground/70 hover:bg-muted/20";
    case "none":
    default:
      return compact
        ? "border-transparent bg-transparent hover:bg-muted/40"
        : "border-border/50 bg-muted/20 hover:bg-muted/30";
  }
}

function DayCell({
  date,
  monthIndex,
  summary,
  workHoursPreferences,
  isToday,
  isSelected,
  compact,
  onDateSelect,
  dayOffOverride,
  hasNote,
}: {
  date: string;
  monthIndex: number;
  summary?: DayLogSummary;
  workHoursPreferences: WorkHoursPreferences;
  isToday: boolean;
  isSelected: boolean;
  compact: boolean;
  onDateSelect?: (date: string) => void;
  dayOffOverride?: boolean | null;
  hasNote?: boolean;
}) {
  const isMobile = useIsMobileLayout();
  const [, monthStr, dayStr] = date.split("-");
  const inMonth = Number(monthStr) - 1 === monthIndex;
  const weekend = isWeekend(date);
  const hasEntries = (summary?.entryCount ?? 0) > 0;
  const isMarkedDayOff = dayOffOverride === true;
  const status = resolveDayStatus(date, summary, workHoursPreferences, dayOffOverride);
  const showDayOffHatch = inMonth && (isMarkedDayOff || weekend);

  const centerCellContent = isMobile && !compact;

  const className = cn(
    "group relative flex flex-col rounded-md border transition-colors",
    centerCellContent ? "items-center text-center" : "text-left",
    compact
      ? "min-h-[2.5rem] items-center justify-center gap-0.5 p-0.5"
      : "min-h-[4.5rem] p-1.5 sm:min-h-[5.5rem] sm:p-2",
    statusClasses(status, inMonth, compact),
    isSelected && "ring-2 ring-inset ring-primary",
    isToday && !isSelected && "ring-1 ring-inset ring-primary/50",
    showDayOffHatch && DAY_OFF_HATCH,
    weekend && inMonth && status === "none" && "border-border/50",
  );

  const noteSuffix = hasNote ? ", has note" : "";
  const ariaLabel = hasEntries
    ? `${date}: ${formatHours(summary!.totalMinutes, false)}, ${summary!.entryCount} entries${isMarkedDayOff ? ", day off" : ""}${noteSuffix}`
    : status === "off"
      ? `${date}: day off${noteSuffix}`
      : isMarkedDayOff
        ? `${date}: marked day off${noteSuffix}`
        : hasNote
          ? `${date}: has note`
          : `${date}: no entries`;

  const content = (
    <>
      <span
        className={cn(
          "font-medium tabular-nums",
          compact ? "text-[11px] leading-none" : "text-sm",
          inMonth ? "text-foreground" : "text-muted-foreground/50",
          weekend && inMonth && "text-muted-foreground/75",
          status === "off" && inMonth && "text-muted-foreground/70",
        )}
      >
        {Number(dayStr)}
      </span>

      {!compact && inMonth && hasEntries && (
        <div className={cn("space-y-0.5", centerCellContent ? "mt-0.5" : "mt-auto")}>
          <span className="block text-xs font-semibold tabular-nums">
            {formatHours(summary!.totalMinutes, false)}
          </span>
          <span className="block text-[10px] text-muted-foreground sm:text-xs">
            {summary!.entryCount} {isMobile ? "en." : summary!.entryCount === 1 ? "entry" : "entries"}
          </span>
        </div>
      )}

      {!compact && inMonth && !hasEntries && (
        <span
          className={cn(
            "text-[10px] text-muted-foreground sm:text-xs",
            centerCellContent ? "mt-0.5" : "mt-auto",
          )}
        >
          {status === "off" ? "Off" : "—"}
        </span>
      )}

      {compact && inMonth && hasEntries && (
        <span className="text-[8px] font-semibold tabular-nums leading-none text-foreground/75">
          {formatHours(summary!.totalMinutes, true)}h
        </span>
      )}

      {compact && inMonth && !hasEntries && (
        <span className="text-[9px] leading-none text-transparent" aria-hidden>
          ·
        </span>
      )}

      {hasNote && inMonth && (
        <span
          className={cn(
            "absolute left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-sky-500/90",
            compact ? "bottom-px w-2.5" : "bottom-[3px] w-3",
          )}
          aria-hidden
        />
      )}
    </>
  );

  if (onDateSelect) {
    return (
      <button
        type="button"
        onClick={() => onDateSelect(date)}
        className={className}
        aria-label={ariaLabel}
        aria-current={isSelected ? "date" : undefined}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={`/app/dashboard?date=${date}`} className={className} aria-label={ariaLabel}>
      {content}
    </Link>
  );
}

export function MonthCalendar({
  monthIndex,
  gridDates,
  daySummaries,
  workHoursPreferences,
  selectedDate,
  compact = false,
  showLegend,
  onDateSelect,
  dayLogsByDate,
}: MonthCalendarProps) {
  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const weekdayLabels = compact ? WEEKDAY_LABELS_COMPACT : WEEKDAY_LABELS;
  const legendVisible = showLegend ?? !compact;
  const { dailyWorkHours } = workHoursPreferences;

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      <div
        className={cn(
          "grid grid-cols-7 text-center font-medium text-muted-foreground",
          compact ? "gap-1 text-[10px]" : "gap-1 text-xs",
        )}
      >
        {weekdayLabels.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className={cn(
              compact ? "py-0.5" : "py-1",
              (index === 5 || index === 6) && "text-muted-foreground/50",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {gridDates.map((date) => {
          const dayLog = dayLogsByDate?.get(date);
          const hasNote = Boolean(dayLog?.note?.trim());

          return (
          <DayCell
            key={date}
            date={date}
            monthIndex={monthIndex}
            summary={daySummaries.get(date)}
            workHoursPreferences={workHoursPreferences}
            isToday={date === today}
            isSelected={date === selectedDate}
            compact={compact}
            onDateSelect={onDateSelect}
            dayOffOverride={dayLog?.isDayOff ?? null}
            hasNote={hasNote}
          />
          );
        })}
      </div>

      {legendVisible && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground",
            compact ? "flex-col items-start gap-1 pt-1.5 text-[10px]" : "gap-x-4 pt-2 text-xs",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-sm border border-emerald-500/50 bg-emerald-500/20",
                compact ? "h-2.5 w-2.5" : "h-3 w-3",
              )}
            />
            {compact ? `≥ ${dailyWorkHours}h` : `≥ ${dailyWorkHours}h`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-sm border border-amber-500/50 bg-amber-500/20",
                compact ? "h-2.5 w-2.5" : "h-3 w-3",
              )}
            />
            {compact ? `< ${dailyWorkHours}h` : `Below ${dailyWorkHours}h`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-sm border border-border/50 bg-muted/20",
                compact ? "h-2.5 w-2.5" : "h-3 w-3",
              )}
            />
            No entries
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-sm border border-border/50 bg-muted/10",
                DAY_OFF_HATCH,
                compact ? "h-2.5 w-2.5" : "h-3 w-3",
              )}
            />
            Non-work day
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-sm border border-emerald-500/50 bg-emerald-500/20",
                DAY_OFF_HATCH,
                compact ? "h-2.5 w-2.5" : "h-3 w-3",
              )}
            />
            Day off
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "relative rounded-sm border border-transparent bg-muted/10",
                compact ? "h-2.5 w-2.5" : "h-3 w-3",
              )}
            >
              <span className="absolute bottom-px left-1/2 h-0.5 w-2.5 -translate-x-1/2 rounded-full bg-sky-500/90" />
            </span>
            Note
          </span>
        </div>
      )}
    </div>
  );
}
