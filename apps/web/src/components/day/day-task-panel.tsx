import { forwardRef, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Filter, GripVertical, Pencil, Pin, Play, Square } from "lucide-react";
import { TaskStatus, type TaskWithRelations } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { taskProjectAccentColor } from "@/lib/project-colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog";
import { TASK_DRAG_MIME, type TaskDragPayload } from "@/components/day/day-timeline-types";
import {
  formatTaskScheduleLabel,
  isTaskVisibleInScope,
  taskDateOnly,
  type TaskScopeFilter,
} from "@/lib/task-day-visibility";
import { toDateInputValue } from "@/lib/datetime";
import {
  loadTaskSortMode,
  moveTaskToIndex,
  previewTaskOrder,
  resolveTaskInsertIndex,
  saveTaskSortMode,
  sortTasks,
  TASK_REORDER_MIME,
  type TaskSortMode,
} from "@/lib/task-order";

type DayTaskPanelProps = {
  selectedDate: string;
  onDragStart: () => void;
  onDragEnd: () => void;
  activeTaskIds: Set<string>;
  pendingTaskId?: string | null;
  onQuickToggle: (task: TaskWithRelations) => void;
};

export function DayTaskPanel({
  selectedDate,
  onDragStart,
  onDragEnd,
  activeTaskIds,
  pendingTaskId,
  onQuickToggle,
}: DayTaskPanelProps) {
  const qc = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const reorderDragRef = useRef<{ taskId: string; insertIndex: number } | null>(null);
  const [scopeFilter, setScopeFilter] = useState<TaskScopeFilter>("today");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(() => new Set());
  const [sortMode, setSortMode] = useState<TaskSortMode>(() => loadTaskSortMode());
  const [reorderingTaskId, setReorderingTaskId] = useState<string | null>(null);
  const [previewInsertIndex, setPreviewInsertIndex] = useState<number | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const manualOrder = sortMode === "manual";

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.listTasks(),
  });

  const reorderTasks = useMutation({
    mutationFn: (taskIds: string[]) => api.reorderTasks(taskIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const projectColorById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.color])),
    [projects],
  );

  const today = useMemo(() => toDateInputValue(new Date()), []);

  const filtersActive = scopeFilter !== "today" || selectedProjectIds.size > 0;

  const activeTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (task.status !== TaskStatus.DONE) {
        if (selectedProjectIds.size > 0 && !selectedProjectIds.has(task.projectId)) {
          return false;
        }
        return isTaskVisibleInScope(task, scopeFilter, selectedDate, today);
      }
      return false;
    });
    return sortTasks(filtered, sortMode);
  }, [tasks, sortMode, selectedDate, today, scopeFilter, selectedProjectIds]);

  const displayTasks = useMemo(() => {
    if (!manualOrder || !reorderingTaskId) return activeTasks;
    return previewTaskOrder(activeTasks, reorderingTaskId, previewInsertIndex);
  }, [activeTasks, manualOrder, previewInsertIndex, reorderingTaskId]);

  function handleSortModeChange(value: TaskSortMode) {
    setSortMode(value);
    saveTaskSortMode(value);
  }

  function finishReorderDrag() {
    reorderDragRef.current = null;
    setReorderingTaskId(null);
    setPreviewInsertIndex(null);
    onDragEnd();
  }

  function handleInsertAt(insertIndex: number, draggedTaskId: string) {
    const next = moveTaskToIndex(
      activeTasks.map((task) => task.id),
      draggedTaskId,
      insertIndex,
    );
    if (!next) return;
    reorderTasks.mutate(next);
  }

  function setRowRef(taskId: string, node: HTMLDivElement | null) {
    if (node) rowRefs.current.set(taskId, node);
    else rowRefs.current.delete(taskId);
  }

  useEffect(() => {
    if (!reorderingTaskId) return;

    function onDragOver(e: DragEvent) {
      const drag = reorderDragRef.current;
      if (!drag) return;

      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

      const listEl = listRef.current;
      if (!listEl) return;

      const rect = listEl.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return;

      const nextIndex = resolveTaskInsertIndex(
        e.clientY,
        activeTasks,
        drag.taskId,
        (taskId) => rowRefs.current.get(taskId),
      );

      if (nextIndex === drag.insertIndex) return;
      drag.insertIndex = nextIndex;
      setPreviewInsertIndex(nextIndex);
    }

    function onDrop(e: DragEvent) {
      const drag = reorderDragRef.current;
      if (!drag) return;

      const listEl = listRef.current;
      if (!listEl) return;

      const rect = listEl.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return;

      const draggedTaskId = e.dataTransfer?.getData(TASK_REORDER_MIME);
      if (!draggedTaskId) return;

      e.preventDefault();
      e.stopPropagation();
      handleInsertAt(drag.insertIndex, draggedTaskId);
    }

    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [activeTasks, reorderingTaskId]);

  function toggleProject(projectId: string) {
    setSelectedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold leading-none tracking-tight">Tasks</h3>
        <div className="flex items-center gap-1">
          <Popover>
            <DelayedTooltip label="Filter tasks">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={filtersActive ? "default" : "outline"}
                  aria-label="Filter tasks"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </DelayedTooltip>
            <PopoverContent align="end" className="w-56 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Show</p>
              <div role="radiogroup" aria-label="Task scope" className="space-y-0.5">
                <ScopeFilterOption
                  label="Today"
                  active={scopeFilter === "today"}
                  onSelect={() => setScopeFilter("today")}
                />
                <ScopeFilterOption
                  label="This week"
                  active={scopeFilter === "week"}
                  onSelect={() => setScopeFilter("week")}
                />
                <ScopeFilterOption
                  label="Incoming"
                  active={scopeFilter === "incoming"}
                  onSelect={() => setScopeFilter("incoming")}
                />
                <ScopeFilterOption
                  label="All"
                  active={scopeFilter === "all"}
                  onSelect={() => setScopeFilter("all")}
                />
              </div>

              <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Projects</p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {projects.length === 0 && (
                  <p className="px-0.5 text-xs text-muted-foreground">No projects</p>
                )}
                {projects.map((project) => (
                  <label key={project.id} className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={selectedProjectIds.has(project.id)}
                      onCheckedChange={() => toggleProject(project.id)}
                    />
                    <Label className="cursor-pointer truncate font-normal">{project.name}</Label>
                  </label>
                ))}
              </div>
              {selectedProjectIds.size > 0 && (
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 h-auto px-0.5 py-0 text-xs"
                  onClick={() => setSelectedProjectIds(new Set())}
                >
                  Clear projects
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <Popover>
            <DelayedTooltip label="Sort tasks">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={sortMode !== "manual" ? "default" : "outline"}
                  aria-label="Sort tasks"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </DelayedTooltip>
            <PopoverContent align="end" className="w-48 p-2">
              <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">Order</p>
              <div className="space-y-0.5">
                <SortModeOption
                  label="Manual order"
                  active={sortMode === "manual"}
                  onSelect={() => handleSortModeChange("manual")}
                />
                <SortModeOption
                  label="Recently updated"
                  active={sortMode === "recent"}
                  onSelect={() => handleSortModeChange("recent")}
                />
                <SortModeOption
                  label="Name A–Z"
                  active={sortMode === "name"}
                  onSelect={() => handleSortModeChange("name")}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 overflow-y-auto pr-0.5">
        {isLoading && (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading tasks…</p>
        )}
        {!isLoading && activeTasks.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No active tasks.</p>
        )}
        {!isLoading && activeTasks.length > 0 && (
          <div ref={listRef} className="flex flex-col gap-1.5">
            {displayTasks.map((task) => {
              const sourceIndex = activeTasks.findIndex((entry) => entry.id === task.id);

              return (
                <TaskRow
                  key={task.id}
                  ref={(node) => setRowRef(task.id, node)}
                  task={task}
                  projectColorById={projectColorById}
                  selectedDate={selectedDate}
                  today={today}
                  isActive={activeTaskIds.has(task.id)}
                  isPending={pendingTaskId === task.id}
                  isDragging={reorderingTaskId === task.id}
                  manualOrder={manualOrder}
                  onDragStart={onDragStart}
                  onReorderDragStart={() => {
                    reorderDragRef.current = { taskId: task.id, insertIndex: sourceIndex };
                    setReorderingTaskId(task.id);
                    setPreviewInsertIndex(sourceIndex);
                  }}
                  onDragEnd={finishReorderDrag}
                  onQuickToggle={onQuickToggle}
                  onEdit={() => setEditTaskId(task.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <TaskDetailsDialog
        open={editTaskId != null}
        onOpenChange={(open) => {
          if (!open) setEditTaskId(null);
        }}
        taskId={editTaskId}
      />
    </div>
  );
}

function ScopeFilterOption({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50",
        active && "bg-muted font-medium",
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-primary" : "border-muted-foreground/40",
        )}
        aria-hidden
      >
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function SortModeOption({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50",
        active && "bg-muted font-medium",
      )}
    >
      {label}
    </button>
  );
}

const TASK_ROW_DRAG_IMAGE_OPACITY = 0.93;

function readSolidSurfaceColor(className: "bg-card" | "bg-background"): string {
  const probe = document.createElement("div");
  probe.className = className;
  probe.style.position = "fixed";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return color;
}

function setTaskRowDragImage(event: DragEvent, row: HTMLElement) {
  const rect = row.getBoundingClientRect();
  const clone = row.cloneNode(true) as HTMLElement;

  clone.querySelectorAll("[data-no-row-drag]").forEach((node) => node.remove());

  const computed = getComputedStyle(row);
  clone.style.width = `${rect.width}px`;
  clone.style.position = "fixed";
  clone.style.top = "-9999px";
  clone.style.left = "-9999px";
  clone.style.margin = "0";
  clone.style.opacity = String(TASK_ROW_DRAG_IMAGE_OPACITY);
  clone.style.borderRadius = computed.borderRadius;
  clone.style.border = computed.border;
  clone.style.backgroundColor = readSolidSurfaceColor("bg-card");
  clone.style.boxShadow = "0 8px 20px rgb(15 23 42 / 0.16)";
  clone.style.overflow = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.transform = "none";
  clone.style.transition = "none";

  document.body.appendChild(clone);
  event.dataTransfer.setDragImage(
    clone,
    event.clientX - rect.left,
    event.clientY - rect.top,
  );

  window.setTimeout(() => clone.remove(), 0);
}

const TaskRow = forwardRef(function TaskRow(
  {
    task,
    projectColorById,
    selectedDate,
    today,
    isActive,
    isPending,
    isDragging = false,
    manualOrder,
    onDragStart,
    onReorderDragStart,
    onDragEnd,
    onQuickToggle,
    onEdit,
  }: {
    task: TaskWithRelations;
    projectColorById: ReadonlyMap<string, string>;
    selectedDate: string;
    today: string;
    isActive: boolean;
    isPending: boolean;
    isDragging?: boolean;
    manualOrder: boolean;
    onDragStart: () => void;
    onReorderDragStart: () => void;
    onDragEnd: () => void;
    onQuickToggle: (task: TaskWithRelations) => void;
    onEdit: () => void;
  },
  ref: Ref<HTMLDivElement>,
) {
  const payload: TaskDragPayload = {
    taskId: task.id,
    projectId: task.projectId,
    title: task.title,
  };
  const scheduleLabel = formatTaskScheduleLabel(task);
  const dueDate = taskDateOnly(task.scheduledTo);
  const isOverdue = Boolean(dueDate && selectedDate > dueDate && selectedDate === today);
  const projectColor = taskProjectAccentColor(task, projectColorById);

  return (
    <div
      ref={ref}
      draggable
      onDragStart={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-row-drag]")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData(TASK_DRAG_MIME, JSON.stringify(payload));
        if (manualOrder) {
          e.dataTransfer.setData(TASK_REORDER_MIME, task.id);
          onReorderDragStart();
        }
        e.dataTransfer.effectAllowed = manualOrder ? "copyMove" : "copy";
        setTaskRowDragImage(e.nativeEvent, e.currentTarget);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "relative flex w-full cursor-grab items-start gap-1 overflow-hidden rounded-md border border-border/50 bg-card py-1.5 pl-2 pr-1.5 text-sm shadow-sm active:cursor-grabbing",
        "transition-[transform,box-shadow,border-color,background-color]",
        !isDragging && "hover:border-border hover:bg-white hover:shadow-md dark:hover:bg-card",
        isActive && !isDragging && "border-emerald-500/35 bg-emerald-50/60 dark:bg-emerald-950/25",
        isDragging &&
          "border-primary/60 border-dashed bg-primary/5 opacity-35 shadow-none ring-0",
      )}
      title={manualOrder ? "Drag to reorder or drop on timeline" : "Drag to timeline"}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: projectColor }}
        aria-hidden
      />

      <div
        className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground pointer-events-none"
        aria-hidden
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 py-0.5 select-none">
        <div className="flex min-w-0 items-center gap-1">
          <div className="truncate font-medium">{task.title}</div>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {task.externalId ? `${task.externalId} · ` : ""}
          {task.project?.name}
          {scheduleLabel ? ` · ${scheduleLabel}` : ""}
          {isOverdue ? " · overdue" : ""}
        </div>
      </div>

      {task.pinned ? (
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center pointer-events-none select-none"
          title="Pinned"
          aria-hidden
        >
          <Pin className="h-3.5 w-3.5 fill-muted-foreground/25 text-muted-foreground/50" />
        </div>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-no-row-drag
        draggable={false}
        className="mt-0.5 h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
        onClick={onEdit}
        title={`Edit ${task.title}`}
        aria-label={`Edit ${task.title}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-no-row-drag
        draggable={false}
        className={cn(
          "mt-0.5 h-7 w-7 shrink-0 cursor-pointer",
          isActive
            ? "text-amber-600 hover:text-amber-700"
            : "text-muted-foreground hover:text-emerald-600",
        )}
        disabled={isPending}
        onClick={() => onQuickToggle(task)}
        title={isActive ? "Stop tracking" : "Start tracking"}
        aria-label={isActive ? `Stop tracking ${task.title}` : `Start tracking ${task.title}`}
      >
        {isActive ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
});
