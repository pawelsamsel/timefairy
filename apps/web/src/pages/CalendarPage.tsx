import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  buildMonthGrid,
  countMonthWorkDayStats,
  formatMonthLabel,
  monthBounds,
  shiftMonth,
  summarizeEntriesByDay,
  toMonthInputValue,
} from "@/lib/month-calendar";
import { filterBillableEntries, fallbackWorkHoursPreferences } from "@/lib/work-hours";
import { useWorkHoursPreferences } from "@/lib/use-work-hours-preferences";
import { dayLogsByDate } from "@/lib/day-logs";

export function CalendarPage() {
  const [searchParams] = useSearchParams();
  const selectedDate = searchParams.get("date") ?? undefined;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());

  const prefsQuery = useWorkHoursPreferences();
  const workHoursPreferences = fallbackWorkHoursPreferences(prefsQuery.data);

  const range = useMemo(() => monthBounds(year, monthIndex), [year, monthIndex]);
  const gridDates = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });

  const entriesQuery = useQuery({
    queryKey: ["time-entries", "calendar", range.fromDate, range.toDate],
    queryFn: () => api.listTimeEntries({ from: range.from, to: range.to }),
  });

  const dayLogsQuery = useQuery({
    queryKey: ["day-logs", range.fromDate, range.toDate],
    queryFn: () => api.listDayLogs({ from: range.fromDate, to: range.toDate }),
  });

  const dayLogsMap = useMemo(
    () => dayLogsByDate(dayLogsQuery.data ?? []),
    [dayLogsQuery.data],
  );

  const relevantEntries = useMemo(
    () =>
      filterBillableEntries(
        entriesQuery.data ?? [],
        projectsQuery.data ?? [],
        workHoursPreferences.onlyBillableProjects,
      ),
    [entriesQuery.data, projectsQuery.data, workHoursPreferences.onlyBillableProjects],
  );

  const daySummaries = useMemo(
    () => summarizeEntriesByDay(relevantEntries, workHoursPreferences),
    [relevantEntries, workHoursPreferences],
  );

  const monthStats = useMemo(
    () => countMonthWorkDayStats(year, monthIndex, daySummaries, workHoursPreferences),
    [daySummaries, year, monthIndex, workHoursPreferences],
  );

  function goToMonth(nextYear: number, nextMonthIndex: number) {
    setYear(nextYear);
    setMonthIndex(nextMonthIndex);
  }

  function goToToday() {
    const today = new Date();
    setYear(today.getFullYear());
    setMonthIndex(today.getMonth());
  }

  const loadError =
    entriesQuery.isError || projectsQuery.isError || prefsQuery.isError || dayLogsQuery.isError
      ? getErrorMessage(
          entriesQuery.error ?? projectsQuery.error ?? prefsQuery.error ?? dayLogsQuery.error,
          "Cannot load calendar data",
        )
      : null;

  const loading =
    entriesQuery.isLoading || projectsQuery.isLoading || prefsQuery.isLoading || dayLogsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="hidden md:block text-center md:text-left">
        <h1 className="hidden text-xl font-semibold tracking-tight md:block">Calendar</h1>
        <p className="mt-1 hidden text-sm text-muted-foreground md:block">
          See which work days have logged time and whether they meet your target. Configure rules in
          Settings → Work hours.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{formatMonthLabel(year, monthIndex)}</CardTitle>
            <CardDescription>
              {loading
                ? "Loading…"
                : `${monthStats.daysWithEntries} days with entries · ${(monthStats.totalMinutes / 60).toFixed(1)} h total · ${monthStats.daysMet} work days ≥ ${workHoursPreferences.dailyWorkHours}h · ${monthStats.daysBelow} below target · ${monthStats.workDays} work days`}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                const prev = shiftMonth(year, monthIndex, -1);
                goToMonth(prev.year, prev.monthIndex);
              }}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="month"
              value={toMonthInputValue(year, monthIndex)}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                if (y && m) goToMonth(y, m - 1);
              }}
              className="w-auto min-h-8 native-picker-input"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                const next = shiftMonth(year, monthIndex, 1);
                goToMonth(next.year, next.monthIndex);
              }}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" onClick={goToToday}>
              Today
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loadError && (
            <p className="mb-4 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {loadError}
            </p>
          )}

          <MonthCalendar
            monthIndex={monthIndex}
            gridDates={gridDates}
            daySummaries={daySummaries}
            workHoursPreferences={workHoursPreferences}
            selectedDate={selectedDate}
            dayLogsByDate={dayLogsMap}
          />
        </CardContent>
      </Card>
    </div>
  );
}
