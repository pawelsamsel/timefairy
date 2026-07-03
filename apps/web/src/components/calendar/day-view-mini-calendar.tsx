import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WorkHoursPreferences } from "@timefairy/shared-types";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { filterDayViewEntries, type DayViewFilters } from "@/lib/day-view-preferences";
import {
  buildMonthGrid,
  dateParts,
  formatMonthLabel,
  monthBounds,
  shiftMonth,
  summarizeEntriesByDay,
} from "@/lib/month-calendar";
import { filterBillableEntries } from "@/lib/work-hours";

type DayViewMiniCalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  filters: DayViewFilters;
  projectClientIds: Map<string, string>;
  filtersActive: boolean;
  workHoursPreferences: WorkHoursPreferences;
};

export function DayViewMiniCalendar({
  selectedDate,
  onSelectDate,
  filters,
  projectClientIds,
  filtersActive,
  workHoursPreferences,
}: DayViewMiniCalendarProps) {
  const selectedParts = useMemo(() => dateParts(selectedDate), [selectedDate]);
  const [year, setYear] = useState(selectedParts.year);
  const [monthIndex, setMonthIndex] = useState(selectedParts.monthIndex);

  useEffect(() => {
    setYear(selectedParts.year);
    setMonthIndex(selectedParts.monthIndex);
  }, [selectedParts.year, selectedParts.monthIndex]);

  const range = useMemo(() => monthBounds(year, monthIndex), [year, monthIndex]);
  const gridDates = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });

  const entriesQuery = useQuery({
    queryKey: ["time-entries", "mini-calendar", range.fromDate, range.toDate],
    queryFn: () => api.listTimeEntries({ from: range.from, to: range.to }),
  });

  const filteredEntries = useMemo(() => {
    const billableFiltered = filterBillableEntries(
      entriesQuery.data ?? [],
      projectsQuery.data ?? [],
      workHoursPreferences.onlyBillableProjects,
    );
    return filterDayViewEntries(billableFiltered, filters, projectClientIds);
  }, [
    entriesQuery.data,
    projectsQuery.data,
    filters,
    projectClientIds,
    workHoursPreferences.onlyBillableProjects,
  ]);

  const daySummaries = useMemo(
    () => summarizeEntriesByDay(filteredEntries, workHoursPreferences),
    [filteredEntries, workHoursPreferences],
  );

  const monthTotalMinutes = useMemo(
    () => Array.from(daySummaries.values()).reduce((sum, summary) => sum + summary.totalMinutes, 0),
    [daySummaries],
  );

  return (
    <Card className="flex h-full min-h-0 w-[14rem] shrink-0 flex-col overflow-hidden self-stretch">
      <CardHeader className="shrink-0 space-y-2 px-3 pb-2 pt-3">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-medium">
              {formatMonthLabel(year, monthIndex)}
            </CardTitle>
            {filtersActive && (
              <Badge variant="secondary" className="mt-1 font-normal">
                Filtered
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const prev = shiftMonth(year, monthIndex, -1);
                setYear(prev.year);
                setMonthIndex(prev.monthIndex);
              }}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const next = shiftMonth(year, monthIndex, 1);
                setYear(next.year);
                setMonthIndex(next.monthIndex);
              }}
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-0">
        <MonthCalendar
          monthIndex={monthIndex}
          gridDates={gridDates}
          daySummaries={daySummaries}
          workHoursPreferences={workHoursPreferences}
          selectedDate={selectedDate}
          compact
          showLegend
          onDateSelect={onSelectDate}
        />
      </CardContent>
      <div className="shrink-0 border-t border-border/30 px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Month total</span>
          <span className="font-semibold tabular-nums tracking-tight">
            {(monthTotalMinutes / 60).toFixed(2)} h
          </span>
        </div>
      </div>
    </Card>
  );
}
