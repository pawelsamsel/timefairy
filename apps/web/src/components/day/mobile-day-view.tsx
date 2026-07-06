import { ChevronLeft, ChevronRight, Menu, NotebookPen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import { addDays, formatDayLabel, formatMobileDayHeaderLabel, toDateInputValue } from "@/lib/datetime";
import { useMobileShell } from "@/lib/mobile-shell-context";
import { elapsedSecondsFromStart, formatElapsedDuration } from "@/lib/tracking-time";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DayLogPanel } from "@/components/day/day-log-panel";
import {
  MOBILE_SHELL_HEADER_BAR_CLASS,
  MOBILE_SHELL_HEADER_ICON_BUTTON_CLASS,
  MOBILE_SHELL_HEADER_ICON_CLASS,
} from "@/components/layout/mobile-page-header";
import { useEffect, useState } from "react";

type MobileDayHeaderProps = {
  selectedDate: string;
  totalMinutes: number;
  dailyWorkHours: number;
  onSelectDate: (date: string) => void;
  dayLogPanelVisible: boolean;
  onDayLogPanelVisibleChange: (visible: boolean) => void;
};

export function MobileDayHeader({
  selectedDate,
  totalMinutes,
  dailyWorkHours,
  onSelectDate,
  dayLogPanelVisible,
  onDayLogPanelVisibleChange,
}: MobileDayHeaderProps) {
  const { openMenu } = useMobileShell();
  const today = toDateInputValue(new Date());
  const isTodaySelected = selectedDate === today;

  const dayLogQuery = useQuery({
    queryKey: ["day-log", selectedDate],
    queryFn: () => api.getDayLog(selectedDate),
  });
  const hasNote = Boolean(dayLogQuery.data?.note?.trim());

  return (
    <>
      <div className="relative shrink-0 bg-white">
        <div className={cn(MOBILE_SHELL_HEADER_BAR_CLASS)}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={MOBILE_SHELL_HEADER_ICON_BUTTON_CLASS}
            onClick={openMenu}
            aria-label="Open menu"
          >
            <Menu className={MOBILE_SHELL_HEADER_ICON_CLASS} />
          </Button>

          <div className="flex min-w-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={MOBILE_SHELL_HEADER_ICON_BUTTON_CLASS}
              onClick={() => onSelectDate(addDays(selectedDate, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className={MOBILE_SHELL_HEADER_ICON_CLASS} />
            </Button>

            <button
              type="button"
              className="min-w-0 flex-1 px-0.5 text-center"
              onClick={() => {
                if (!isTodaySelected) onSelectDate(today);
              }}
              aria-label={isTodaySelected ? formatDayLabel(selectedDate) : "Go to today"}
            >
              <div className="truncate text-base font-semibold leading-none tracking-tight">
                {formatMobileDayHeaderLabel(selectedDate)}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1 inline-flex rounded-full border px-2 py-px text-[11px] leading-none tabular-nums",
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
              className={MOBILE_SHELL_HEADER_ICON_BUTTON_CLASS}
              onClick={() => onSelectDate(addDays(selectedDate, 1))}
              aria-label="Next day"
            >
              <ChevronRight className={MOBILE_SHELL_HEADER_ICON_CLASS} />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              MOBILE_SHELL_HEADER_ICON_BUTTON_CLASS,
              hasNote ? "text-primary" : "text-slate-400",
            )}
            onClick={() => onDayLogPanelVisibleChange(!dayLogPanelVisible)}
            aria-pressed={dayLogPanelVisible}
            aria-label={dayLogPanelVisible ? "Hide day note" : "Show day note"}
            aria-expanded={dayLogPanelVisible}
          >
            <NotebookPen className={MOBILE_SHELL_HEADER_ICON_CLASS} />
          </Button>
        </div>
      </div>

      {dayLogPanelVisible && <DayLogPanel selectedDate={selectedDate} />}
    </>
  );
}

type MobileDayTabBarProps = {
  activeTab: "tasks" | "timeline";
  onTabChange: (tab: "tasks" | "timeline") => void;
};

export function MobileDayTabBar({ activeTab, onTabChange }: MobileDayTabBarProps) {
  const tabs = [
    { id: "timeline" as const, label: "Timeline" },
    { id: "tasks" as const, label: "Tasks" },
  ];

  return (
    <div className="flex shrink-0 border-b border-steel-azure bg-white">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "relative flex-1 py-3 text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-slate-400",
            )}
            onClick={() => onTabChange(tab.id)}
            aria-pressed={isActive}
          >
            {tab.label}
            {isActive ? (
              <span
                className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-imperial-blue"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
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
