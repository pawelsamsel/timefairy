import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, List, ListTodo, Plus } from "lucide-react";
import { DayViewToolbar } from "@/components/day/day-view-toolbar";
import { EntrySource, LaneType, TrackTimeMode, type TaskWithRelations, type TimeEntryWithRelations } from "@timefairy/shared-types";
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
import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
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
import { DayViewMiniCalendar } from "@/components/calendar/day-view-mini-calendar";
import {
  fallbackWorkHoursPreferences,
  resolveEffectiveWorkHoursPreferences,
} from "@/lib/work-hours";
import { useWorkHoursPreferences } from "@/lib/use-work-hours-preferences";
import { findActiveTaskStartMoment, findAllActiveTaskMoments, taskForQuickLog } from "@/lib/task-quick-log";
import { findEventsLaneId } from "@/lib/time-entry-kind";
import { useAppDialog } from "@/lib/app-dialog";
import {
  computeLoggedBlockIsoRange,
  elapsedMinutesFromStart,
} from "@/lib/timeline-grid";
import {
  resolveTimelineViewConfig,
  loadTimelineZoomLevel,
  saveTimelineZoomLevel,
  type TimelineZoomLevel,
} from "@/lib/timeline-zoom";

type DayViewMode = "list" | "calendar";

const DAY_VIEW_MODE_KEY = "timefairy-day-view-mode";
const DAY_VIEW_DATE_KEY = "timefairy-view-date:dashboard";
const DAY_VIEW_MINI_CALENDAR_KEY = "timefairy-day-view-mini-calendar";
const DAY_VIEW_TASKS_PANEL_KEY = "timefairy-day-view-tasks-panel";

function loadDayViewMode(): DayViewMode {
  const stored = localStorage.getItem(DAY_VIEW_MODE_KEY);
  return stored === "calendar" ? "calendar" : "list";
}

function loadMiniCalendarVisible(): boolean {
  return localStorage.getItem(DAY_VIEW_MINI_CALENDAR_KEY) === "true";
}

function loadTasksPanelVisible(): boolean {
  const stored = localStorage.getItem(DAY_VIEW_TASKS_PANEL_KEY);
  return stored !== "false";
}

export function DashboardPage() {
  const qc = useQueryClient();
  const timeEntryUndo = useTimeEntryUndo();
  const { confirm, choose } = useAppDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useSessionDate(DAY_VIEW_DATE_KEY);
  const [display, setDisplay] = useDayViewDisplay();
  const [filters, setFilters] = useDayViewFilters();
  const [viewMode, setViewMode] = useState<DayViewMode>(() => loadDayViewMode());
  const [miniCalendarVisible, setMiniCalendarVisible] = useState(() => loadMiniCalendarVisible());
  const [tasksPanelVisible, setTasksPanelVisible] = useState(() => loadTasksPanelVisible());
  const [timelineZoom, setTimelineZoom] = useState<TimelineZoomLevel>(() => loadTimelineZoomLevel());
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntryWithRelations | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState<TimeEntryCreateInitial>({});

  const dayRange = useMemo(() => dayBoundsLocal(selectedDate), [selectedDate]);

  const lanesQuery = useQuery({ queryKey: ["lanes"], queryFn: () => api.listLanes() });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => api.listProjects() });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: () => api.listClients() });
  const workHoursQuery = useWorkHoursPreferences();
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
  const [quickLogError, setQuickLogError] = useState("");
  const [quickLogTaskId, setQuickLogTaskId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(DAY_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(DAY_VIEW_MINI_CALENDAR_KEY, String(miniCalendarVisible));
  }, [miniCalendarVisible]);

  useEffect(() => {
    localStorage.setItem(DAY_VIEW_TASKS_PANEL_KEY, String(tasksPanelVisible));
  }, [tasksPanelVisible]);

  useEffect(() => {
    saveTimelineZoomLevel(timelineZoom);
  }, [timelineZoom]);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam) || dateParam === selectedDate) {
      return;
    }
    setSelectedDate(dateParam);
    const next = new URLSearchParams(searchParams);
    next.delete("date");
    setSearchParams(next, { replace: true });
  }, [searchParams, selectedDate, setSearchParams, setSelectedDate]);

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
  const workHoursPreferences = useMemo(
    () =>
      resolveEffectiveWorkHoursPreferences(
        fallbackWorkHoursPreferences(workHoursQuery.data),
        filters,
        clients,
      ),
    [workHoursQuery.data, filters, clients],
  );

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

  const quickStartTask = useMutation({
    mutationFn: async (task: Pick<TaskWithRelations, "id" | "projectId">) => {
      const eventsLaneId = findEventsLaneId(lanes);
      if (!eventsLaneId) throw new Error("No events lane configured");
      return api.createTimeEntry({
        laneId: eventsLaneId,
        projectId: task.projectId,
        taskId: task.id,
        startAt: new Date().toISOString(),
        source: EntrySource.WEB,
      });
    },
    onMutate: (task) => setQuickLogTaskId(task.id),
    onSettled: () => setQuickLogTaskId(null),
    onSuccess: (created) => {
      timeEntryUndo.pushCreateUndo(created.id);
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      setQuickLogError("");
    },
    onError: (err) => setQuickLogError(getErrorMessage(err, "Failed to start work")),
  });

  const timelineViewConfig = useMemo(
    () => resolveTimelineViewConfig(workHoursPreferences, timelineZoom),
    [workHoursPreferences, timelineZoom],
  );

  async function performQuickStop(
    task: Pick<TaskWithRelations, "id" | "projectId"> & { title?: string },
    options: { enforceMinimum?: boolean; skipPrompt?: boolean } = {},
  ) {
    const now = new Date().toISOString();
    const activeStart = findActiveTaskStartMoment(allEntries, task.id, selectedDate);
    const taskTitle = task.title ?? activeStart?.task?.title ?? "Task";

    if (activeStart?.startAt && defaultLoggedLaneId) {
      const elapsed = elapsedMinutesFromStart(activeStart.startAt, now);
      let enforceMinimum = options.enforceMinimum ?? false;

      if (!options.skipPrompt && !enforceMinimum && elapsed < timelineViewConfig.minEntryMinutes) {
        const choice = await choose({
          title: "Session shorter than minimum",
          description: `"${taskTitle}" ran for ${elapsed} min, below your ${timelineViewConfig.minEntryMinutes} min minimum. What should we do?`,
          primaryLabel: `Log ${timelineViewConfig.minEntryMinutes} min`,
          secondaryLabel: "Skip — don't log",
        });
        if (choice === null) return null;
        if (choice === "secondary") {
          timeEntryUndo.pushDeleteUndo(activeStart);
          await api.deleteTimeEntry(activeStart.id);
          qc.invalidateQueries({ queryKey: ["time-entries"] });
          return null;
        }
        enforceMinimum = true;
      }

      const range = computeLoggedBlockIsoRange(
        selectedDate,
        activeStart.startAt,
        now,
        timelineViewConfig,
        { enforceMinimum },
      );

      return api.createTimeEntry({
        laneId: defaultLoggedLaneId,
        projectId: task.projectId,
        taskId: task.id,
        startAt: range.startAt,
        endAt: range.endAt,
        source: EntrySource.WEB,
      });
    }

    const eventsLaneId = findEventsLaneId(lanes);
    if (!eventsLaneId) throw new Error("No events lane configured");
    return api.createTimeEntry({
      laneId: eventsLaneId,
      projectId: task.projectId,
      taskId: task.id,
      startAt: now,
      source: EntrySource.WEB,
    });
  }

  const quickStopTask = useMutation({
    mutationFn: (task: Pick<TaskWithRelations, "id" | "projectId"> & { title?: string }) =>
      performQuickStop(task),
    onMutate: (task) => setQuickLogTaskId(task.id),
    onSettled: () => setQuickLogTaskId(null),
    onSuccess: (created) => {
      if (!created) return;
      timeEntryUndo.pushCreateUndo(created.id);
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      setQuickLogError("");
    },
    onError: (err) => setQuickLogError(getErrorMessage(err, "Failed to stop work")),
  });

  const activeTaskIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of allEntries) {
      if (!entry.taskId || ids.has(entry.taskId)) continue;
      if (findActiveTaskStartMoment(allEntries, entry.taskId, selectedDate)) {
        ids.add(entry.taskId);
      }
    }
    return ids;
  }, [allEntries, selectedDate]);

  async function handleQuickToggle(task: TaskWithRelations) {
    if (activeTaskIds.has(task.id)) {
      quickStopTask.mutate(task);
      return;
    }

    const otherActiveMoments = findAllActiveTaskMoments(allEntries, selectedDate).filter(
      (entry) => entry.taskId !== task.id,
    );
    const trackTimeMode = workHoursPreferences.trackTimeMode;

    if (otherActiveMoments.length === 0 || trackTimeMode === TrackTimeMode.MULTI) {
      quickStartTask.mutate(task);
      return;
    }

    if (trackTimeMode === TrackTimeMode.ASK) {
      const otherTitle = otherActiveMoments[0].task?.title ?? "another task";
      const confirmed = await confirm({
        title: "Switch tracked task?",
        description: `"${otherTitle}" is currently active. Stop it and start "${task.title}"?`,
        confirmLabel: "Stop and switch",
      });
      if (!confirmed) return;
    }

    setQuickLogTaskId(task.id);
    try {
      for (const moment of otherActiveMoments) {
        const stopTarget = taskForQuickLog(moment);
        if (stopTarget) await quickStopTask.mutateAsync(stopTarget);
      }
      await quickStartTask.mutateAsync(task);
      setQuickLogError("");
    } catch (err) {
      setQuickLogError(getErrorMessage(err, "Failed to switch task"));
    } finally {
      setQuickLogTaskId(null);
    }
  }

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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Day view</h1>
          <p className="text-sm text-muted-foreground">{formatDayLabel(selectedDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-md border bg-background p-0.5">
            <DelayedTooltip label="List">
              <Button
                type="button"
                size="icon"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                aria-label="List"
              >
                <List className="h-4 w-4" />
              </Button>
            </DelayedTooltip>
            <DelayedTooltip label="Calendar">
              <Button
                type="button"
                size="icon"
                variant={viewMode === "calendar" ? "default" : "ghost"}
                onClick={() => setViewMode("calendar")}
                aria-pressed={viewMode === "calendar"}
                aria-label="Calendar"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </DelayedTooltip>
          </div>
          <DelayedTooltip label={miniCalendarVisible ? "Hide mini calendar" : "Mini calendar"}>
            <Button
              type="button"
              size="icon"
              variant={miniCalendarVisible ? "default" : "outline"}
              onClick={() => setMiniCalendarVisible((visible) => !visible)}
              aria-pressed={miniCalendarVisible}
              aria-label={miniCalendarVisible ? "Hide mini calendar" : "Show mini calendar"}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </DelayedTooltip>
          <DelayedTooltip label={tasksPanelVisible ? "Hide tasks" : "Tasks"}>
            <Button
              type="button"
              size="icon"
              variant={tasksPanelVisible ? "default" : "outline"}
              onClick={() => setTasksPanelVisible((visible) => !visible)}
              aria-pressed={tasksPanelVisible}
              aria-label={tasksPanelVisible ? "Hide tasks panel" : "Show tasks panel"}
            >
              <ListTodo className="h-4 w-4" />
            </Button>
          </DelayedTooltip>
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
            className="w-auto min-h-8 native-picker-input"
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
          <DayViewToolbar
            display={display}
            onDisplayChange={setDisplay}
            filters={filters}
            onFiltersChange={setFilters}
            lanes={lanes}
            projects={projects}
            clients={clients}
          />
          <Button type="button" className="gap-1.5" onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4" />
            Add log
          </Button>
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

      {quickLogError && (
        <p className="shrink-0 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          {quickLogError}
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

      <div className="flex min-h-0 flex-1 gap-4">
        {miniCalendarVisible && (
          <DayViewMiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            filters={filters}
            projectClientIds={projectClientIds}
            filtersActive={filtersActive}
            workHoursPreferences={workHoursPreferences}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      {viewMode === "list" ? (
        <div className="flex min-h-0 flex-1 flex-row gap-4">
          <ListDayLayout
            entries={entries}
            allEntryCount={allEntries.length}
            totalMinutes={totalMinutes}
            filtersActive={filtersActive}
            display={display}
            clientNames={clientNames}
            projectClientIds={projectClientIds}
            onEntryClick={setEditEntry}
          />
          {tasksPanelVisible && (
            <DayTasksPanelCard
              selectedDate={selectedDate}
              activeTaskIds={activeTaskIds}
              pendingTaskId={quickLogTaskId}
              onQuickToggle={handleQuickToggle}
              onDragStart={() => setIsDraggingTask(true)}
              onDragEnd={() => setIsDraggingTask(false)}
            />
          )}
        </div>
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
            gridStepMinutes={timelineViewConfig.gridStepMinutes}
            minEntryMinutes={timelineViewConfig.minEntryMinutes}
            useTimeGrid={timelineViewConfig.useTimeGrid}
            hourHeightPx={timelineViewConfig.hourHeightPx}
            zoomLevel={timelineZoom}
            onZoomLevelChange={setTimelineZoom}
            onTaskDrop={handleTaskDrop}
            onEntryClick={setEditEntry}
            onEntryCopy={(entry) => copyEntry.mutate(entry)}
            onEntryScheduleChange={handleEntryScheduleChange}
            onFreeSlotClick={handleFreeSlotClick}
          />
          {tasksPanelVisible && (
            <DayTasksPanelCard
              selectedDate={selectedDate}
              activeTaskIds={activeTaskIds}
              pendingTaskId={quickLogTaskId}
              onQuickToggle={handleQuickToggle}
              onDragStart={() => setIsDraggingTask(true)}
              onDragEnd={() => setIsDraggingTask(false)}
            />
          )}
        </div>
      )}

      <DayViewSummary
        totalMinutes={totalMinutes}
        entryCount={entries.length}
        filtersActive={filtersActive}
        allTotalMinutes={allTotalMinutes}
      />
        </div>
      </div>

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

function DayTasksPanelCard({
  selectedDate,
  activeTaskIds,
  pendingTaskId,
  onQuickToggle,
  onDragStart,
  onDragEnd,
}: {
  selectedDate: string;
  activeTaskIds: Set<string>;
  pendingTaskId?: string | null;
  onQuickToggle: (task: TaskWithRelations) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <Card className="flex h-full min-h-0 w-[22rem] shrink-0 flex-col">
      <CardContent className="flex min-h-0 flex-1 flex-col p-4">
        <DayTaskPanel
          selectedDate={selectedDate}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          activeTaskIds={activeTaskIds}
          pendingTaskId={pendingTaskId}
          onQuickToggle={onQuickToggle}
        />
      </CardContent>
    </Card>
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
}: {
  entries: TimeEntryWithRelations[];
  allEntryCount: number;
  totalMinutes: number;
  filtersActive: boolean;
  display: DayViewDisplayOptions;
  clientNames: Map<string, string>;
  projectClientIds: Map<string, string>;
  onEntryClick: (entry: TimeEntryWithRelations) => void;
}) {
  return (
    <Card className="min-h-0 min-w-0 w-full flex-1 overflow-hidden">
      <CardHeader>
        <CardTitle>Entries this day</CardTitle>
        <CardDescription>
          Total: {(totalMinutes / 60).toFixed(2)} h · {entries.length} entries
        </CardDescription>
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
