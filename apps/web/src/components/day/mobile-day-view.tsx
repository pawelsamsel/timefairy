import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import { addDays, formatMobileDayHeaderLabel, toDateInputValue } from "@/lib/datetime";
import { useMobileShell } from "@/lib/mobile-shell-context";
import { elapsedSecondsFromStart, formatElapsedDuration } from "@/lib/tracking-time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type MobileDayHeaderProps = {
  selectedDate: string;
  totalMinutes: number;
  dailyWorkHours: number;
  onSelectDate: (date: string) => void;
};

export function MobileDayHeader({
  selectedDate,
  totalMinutes,
  dailyWorkHours,
  onSelectDate,
}: MobileDayHeaderProps) {
  const { openMenu } = useMobileShell();
  const today = toDateInputValue(new Date());
  const isTodaySelected = selectedDate === today;

  return (
    <div className="relative shrink-0 border-b border-border/40 pb-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute left-0 top-1/2 z-10 h-10 w-10 -translate-y-1/2"
        onClick={openMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center justify-center">
        <div className="inline-flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => onSelectDate(addDays(selectedDate, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <button
            type="button"
            className="min-w-0 px-1 text-center"
            onClick={() => {
              if (!isTodaySelected) onSelectDate(today);
            }}
            aria-label={isTodaySelected ? formatMobileDayHeaderLabel(selectedDate) : "Go to today"}
          >
            <div className="truncate text-base font-semibold leading-tight tracking-tight">
              {formatMobileDayHeaderLabel(selectedDate)}
            </div>
            <div
              className={cn(
                "mx-auto mt-1.5 inline-flex rounded-full border px-3 py-0.5 text-sm tabular-nums",
                isTodaySelected
                  ? "border-school-bus-yellow/50 bg-school-bus-yellow/15 text-foreground"
                  : "border-border/60 bg-muted/40 text-muted-foreground",
              )}
            >
              {(totalMinutes / 60).toFixed(1)}h / {dailyWorkHours}h
            </div>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => onSelectDate(addDays(selectedDate, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

type MobileDayTabBarProps = {
  activeTab: "tasks" | "timeline";
  onTabChange: (tab: "tasks" | "timeline") => void;
};

export function MobileDayTabBar({ activeTab, onTabChange }: MobileDayTabBarProps) {
  return (
    <div className="flex shrink-0 gap-1 rounded-lg border bg-muted/40 p-1">
      <button
        type="button"
        className={cn(
          "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
          activeTab === "tasks"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
        onClick={() => onTabChange("tasks")}
      >
        Tasks
      </button>
      <button
        type="button"
        className={cn(
          "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
          activeTab === "timeline"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
        onClick={() => onTabChange("timeline")}
      >
        Timeline
      </button>
    </div>
  );
}

type MobileActiveTaskBarProps = {
  moment: TimeEntryWithRelations;
  projectColor?: string | null;
  pending: boolean;
  onStop: () => void;
};

export function MobileActiveTaskBar({
  moment,
  projectColor,
  pending,
  onStop,
}: MobileActiveTaskBarProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!moment.startAt) return null;

  const title = moment.task?.title ?? moment.title ?? "Task";
  const projectName = moment.project?.name ?? "";
  const elapsed = formatElapsedDuration(elapsedSecondsFromStart(moment.startAt, nowMs));

  return (
    <div className="shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-50/80 px-3 py-2.5 shadow-sm dark:bg-emerald-950/30">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: projectColor ?? "var(--primary)" }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {projectName ? `${projectName} · ` : ""}
            <span className="tabular-nums text-emerald-700 dark:text-emerald-300">{elapsed}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 border-amber-500/40 text-amber-800 hover:bg-amber-50 dark:text-amber-200"
          disabled={pending}
          onClick={onStop}
        >
          Stop
        </Button>
      </div>
    </div>
  );
}

export function resolvePrimaryActiveMoment(
  activeMoments: TimeEntryWithRelations[],
): TimeEntryWithRelations | null {
  if (activeMoments.length === 0) return null;
  return [...activeMoments].sort(
    (a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime(),
  )[0];
}

export function resolveActiveMomentProjectColor(
  moment: TimeEntryWithRelations,
  projectColorById: ReadonlyMap<string, string>,
): string | null {
  if (!moment.projectId) return null;
  return projectColorById.get(moment.projectId) ?? null;
}
