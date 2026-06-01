import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { DayViewToolbar } from "@/components/day/day-view-toolbar";
import { EntrySource, LaneType, type TimeEntryWithRelations } from "@timefairy/shared-types";
import { api } from "../lib/api";
import {
  addDays,
  dayBoundsLocal,
  formatDayLabel,
  formatTimeRange,
  toDateInputValue,
} from "@/lib/datetime";
import { dropSlotToIsoRange, slotToFormDatetimeLocal, type TimelineDropSlot } from "@/lib/timeline";
import { DayTaskPanel } from "@/components/day/day-task-panel";
import {
  DayTimeline,
  type EntryScheduleChange,
  type TaskDragPayload,
} from "@/components/day/day-timeline";
import { DayViewSummary } from "@/components/day/day-view-summary";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { entryDisplayColor } from "@/lib/project-colors";
import {
  dayViewFiltersActive,
  EMPTY_DAY_VIEW_FILTERS,
  filterDayViewEntries,
  sanitizeDayViewFilters,
  dayViewFiltersEqual,
  useDayViewDisplay,
  useDayViewFilters,
} from "@/lib/day-view-preferences";
import { formatEntryLabel, entryHasSupplementaryNote, type DayViewDisplayOptions } from "@/lib/entry-display";
import { cn } from "@/lib/utils";
import { useSessionDate } from "@/lib/use-session-date";
import { snapshotForRestore, snapshotForUpdate } from "@/lib/undo/time-entry-undo";
import { useTimeEntryUndo } from "@/lib/undo/undo-context";
import {
  TimeEntryCreateDialog,
  type TimeEntryCreateInitial,
} from "@/components/time-entry/time-entry-create-dialog";
import { TimeEntryEditDialog } from "@/components/time-entry/time-entry-edit-dialog";

type DayViewMode = "list" | "calendar";

const DAY_VIEW_MODE_KEY = "timefairy-day-view-mode";
const DAY_VIEW_DATE_KEY = "timefairy-view-date:dashboard";

function loadDayViewMode(): DayViewMode {
  const stored = localStorage.getItem(DAY_VIEW_MODE_KEY);
  return stored === "calendar" ? "calendar" : "list";
}

export function DashboardPage() {
  const qc = useQueryClient();
  const timeEntryUndo = useTimeEntryUndo();
  const [selectedDate, setSelectedDate] = useSessionDate(DAY_VIEW_DATE_KEY);
  const [display, setDisplay] = useDayViewDisplay();
  const [filters, setFilters] = useDayViewFilters();
  const [viewMode, setViewMode] = useState<DayViewMode>(() => loadDayViewMode());
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntryWithRelations | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState<TimeEntryCreateInitial>({});

  const dayRange = useMemo(() => dayBoundsLocal(selectedDate), [selectedDate]);

  const lanesQuery = useQuery({ queryKey: ["lanes"], queryFn: () => api.listLanes() });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects() });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: () => api.listClients() });
  const entriesQuery = useQuery({
    queryKey: ["time-entries", selectedDate],
    queryFn: () => api.listTimeEntries(dayRange),
  });

  const lanes = lanesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const allEntries = entriesQuery.data ?? [];

  const projectClientIds = useMemo(
    () => new Map(projects.map((p) => [p.id, p.clientId])),
    [projects],
  );
  const clientNames = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );
  const entries = useMemo(
    () => filterDayViewEntries(allEntries, filters, projectClientIds),
    [allEntries, filters, projectClientIds],
  );
  const [dropError, setDropError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    localStorage.setItem(DAY_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (lanes.length === 0 && projects.length === 0 && clients.length === 0) return;
    setFilters((current) => {
      const sanitized = sanitizeDayViewFilters(current, lanes, projects, clients);
      return dayViewFiltersEqual(current, sanitized) ? current : sanitized;
    });
  }, [lanes, projects, clients, setFilters]);

  const totalMinutes = useMemo(
    () => entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [entries],
  );
  const allTotalMinutes = useMemo(
    () => allEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [allEntries],
  );
  const filtersActive = dayViewFiltersActive(filters);

  const defaultLoggedLaneId = useMemo(() => {
    const main =
      lanes.find((l) => l.type === LaneType.LOGGED) ??
      lanes.find((l) => l.name === "Główny") ??
      lanes[0];
    return main?.id;
  }, [lanes]);

  const updateEntrySchedule = useMutation({
    mutationFn: async ({
      entryId,
      startAt,
      endAt,
      before,
    }: EntryScheduleChange & { before: ReturnType<typeof snapshotForUpdate> }) => {
      const entry = allEntries.find((e) => e.id === entryId);
      if (!entry) throw new Error("Entry not found");
      if (!entry.projectId) throw new Error("Entry has no project");
      await api.updateTimeEntry(entryId, {
        laneId: entry.laneId,
        projectId: entry.projectId,
        taskId: entry.taskId ?? undefined,
        startAt,
        endAt,
        note: entry.note ?? undefined,
      });
      return { entryId, before };
    },
    onSuccess: ({ entryId, before }) => {
      timeEntryUndo.pushUpdateUndo(entryId, before);
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      setScheduleError("");
    },
    onError: (err) =>
      setScheduleError(getErrorMessage(err, "Failed to update entry time")),
  });

  const createFromDrop = useMutation({
    mutationFn: async ({
      payload,
      slot,
    }: {
      payload: TaskDragPayload;
      slot: TimelineDropSlot;
    }) => {
      if (!defaultLoggedLaneId) throw new Error("No lane configured");
      const { startAt: startIso, endAt: endIso } = dropSlotToIsoRange(selectedDate, slot);
      return api.createTimeEntry({
        laneId: defaultLoggedLaneId,
        projectId: payload.projectId,
        taskId: payload.taskId,
        startAt: startIso,
        endAt: endIso,
        source: EntrySource.WEB,
      });
    },
    onSuccess: (created) => {
      timeEntryUndo.pushCreateUndo(created.id);
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      setDropError("");
    },
    onError: (err) => setDropError(getErrorMessage(err, "Failed to create entry from task")),
  });

  const copyEntry = useMutation({
    mutationFn: async (entry: TimeEntryWithRelations) => {
      if (!entry.projectId) throw new Error("Entry has no project");
      return api.createTimeEntry(snapshotForRestore(entry));
    },
    onSuccess: (created) => {
      timeEntryUndo.pushCreateUndo(created.id);
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      setCopyError("");
    },
    onError: (err) => setCopyError(getErrorMessage(err, "Failed to copy entry")),
  });

  function openCreateDialog(initialValues: TimeEntryCreateInitial = {}) {
    setCreateInitial(initialValues);
    setCreateOpen(true);
  }

  function handleTaskDrop(payload: TaskDragPayload, slot: TimelineDropSlot) {
    setIsDraggingTask(false);
    createFromDrop.mutate({ payload, slot });
  }

  function handleFreeSlotClick(slot: TimelineDropSlot, durationMinutes?: number) {
    const { startAt: startLocal, endAt: endLocal } = slotToFormDatetimeLocal(
      selectedDate,
      slot,
      durationMinutes,
    );
    openCreateDialog({
      kind: "block",
      startAt: startLocal,
      useEndTime: true,
      endAt: endLocal,
    });
  }

  function handleEntryScheduleChange(change: EntryScheduleChange) {
    const entry = allEntries.find((e) => e.id === change.entryId);
    if (!entry) return;
    updateEntrySchedule.mutate({
      ...change,
      before: snapshotForUpdate(entry),
    });
  }

  const loadError =
    lanesQuery.isError || projectsQuery.isError || clientsQuery.isError || entriesQuery.isError
      ? getErrorMessage(
          lanesQuery.error ?? projectsQuery.error ?? clientsQuery.error ?? entriesQuery.error,
          "Cannot load data",
        )
      : null;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[32rem] flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Day view</h1>
          <p className="text-sm text-muted-foreground">{formatDayLabel(selectedDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border bg-background p-0.5">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="gap-1.5"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              className="gap-1.5"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto min-h-10 native-picker-input"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={() => setSelectedDate(toDateInputValue(new Date()))}>
            Today
          </Button>
          <Button type="button" className="gap-1.5" onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4" />
            Add log
          </Button>
          <DayViewToolbar
            display={display}
            onDisplayChange={setDisplay}
            filters={filters}
            onFiltersChange={setFilters}
            lanes={lanes}
            projects={projects}
            clients={clients}
          />
        </div>
      </div>

      {loadError && (
        <p className="shrink-0 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {loadError}
        </p>
      )}

      {dropError && viewMode === "calendar" && (
        <p className="shrink-0 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {dropError}
        </p>
      )}

      {scheduleError && viewMode === "calendar" && (
        <p className="shrink-0 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {scheduleError}
        </p>
      )}

      {copyError && viewMode === "calendar" && (
        <p className="shrink-0 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {copyError}
        </p>
      )}

      {filtersActive && entries.length === 0 && allEntries.length > 0 && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950">
          <span>
            Filters hide all {allEntries.length} entries on {formatDayLabel(selectedDate).toLowerCase()}.
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => setFilters(EMPTY_DAY_VIEW_FILTERS)}>
            Clear filters
          </Button>
        </div>
      )}

      {viewMode === "list" ? (
        <ListDayLayout
          entries={entries}
          allEntryCount={allEntries.length}
          totalMinutes={totalMinutes}
          filtersActive={filtersActive}
          display={display}
          clientNames={clientNames}
          projectClientIds={projectClientIds}
          onEntryClick={setEditEntry}
          onLogTime={() => openCreateDialog()}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-row gap-4">
          <DayTimeline
            className="min-h-0 min-w-0 flex-1"
            dateStr={selectedDate}
            entries={entries}
            display={display}
            clientNames={clientNames}
            projectClientIds={projectClientIds}
            isDraggingTask={isDraggingTask}
            onTaskDrop={handleTaskDrop}
            onEntryClick={setEditEntry}
            onEntryCopy={(entry) => copyEntry.mutate(entry)}
            onEntryScheduleChange={handleEntryScheduleChange}
            onFreeSlotClick={handleFreeSlotClick}
          />
          <Card className="flex w-[22rem] min-h-0 shrink-0 flex-col overflow-hidden">
            <CardHeader className="shrink-0 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>Tasks</CardTitle>
                  <CardDescription className="pt-1">
                    {(totalMinutes / 60).toFixed(2)} h logged · drag tasks onto the timeline
                  </CardDescription>
                </div>
                <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => openCreateDialog()}>
                  <Plus className="h-4 w-4" />
                  Add log
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <DayTaskPanel
                onDragStart={() => setIsDraggingTask(true)}
                onDragEnd={() => setIsDraggingTask(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <DayViewSummary
        totalMinutes={totalMinutes}
        entryCount={entries.length}
        filtersActive={filtersActive}
        allTotalMinutes={allTotalMinutes}
      />

      <TimeEntryCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        selectedDate={selectedDate}
        initialValues={createInitial}
      />

      <TimeEntryEditDialog
        open={editEntry !== null}
        onOpenChange={(open) => {
          if (!open) setEditEntry(null);
        }}
        entry={editEntry}
      />
    </div>
  );
}

function ListDayLayout({
  entries,
  allEntryCount,
  totalMinutes,
  filtersActive,
  display,
  clientNames,
  projectClientIds,
  onEntryClick,
  onLogTime,
}: {
  entries: TimeEntryWithRelations[];
  allEntryCount: number;
  totalMinutes: number;
  filtersActive: boolean;
  display: DayViewDisplayOptions;
  clientNames: Map<string, string>;
  projectClientIds: Map<string, string>;
  onEntryClick: (entry: TimeEntryWithRelations) => void;
  onLogTime: () => void;
}) {
  return (
    <Card className="w-full min-h-0 flex-1 overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Entries this day</CardTitle>
          <CardDescription>
            Total: {(totalMinutes / 60).toFixed(2)} h · {entries.length} entries
          </CardDescription>
        </div>
        <Button type="button" className="shrink-0 gap-1.5" onClick={onLogTime}>
          <Plus className="h-4 w-4" />
          Add log
        </Button>
      </CardHeader>
      <CardContent className="max-h-full overflow-y-auto space-y-0 divide-y divide-border/40">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            display={display}
            clientNames={clientNames}
            projectClientIds={projectClientIds}
            onClick={() => onEntryClick(entry)}
          />
        ))}
        {entries.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {filtersActive
              ? `No entries for this day matching filters (${allEntryCount} total this day).`
              : "No entries for this day."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EntryRow({
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
  const showNoteSeparately = entryHasSupplementaryNote(entry);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 py-3 text-left text-sm hover:bg-muted/30 transition-colors"
    >
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: entryDisplayColor(entry) }}
        title={entry.lane?.name}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium">{label}</span>
          <span className={cn("rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground")}>
            {entry.lane?.name ?? "Lane"}
          </span>
        </div>
        {display.showTime && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {formatTimeRange(entry.startAt, entry.endAt, entry.durationMinutes)}
          </div>
        )}
        {showNoteSeparately && <div className="mt-1 text-foreground/80">{entry.note}</div>}
      </div>
    </button>
  );
}
