import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Briefcase, GripVertical, Play, Square } from "lucide-react";
import { TaskStatus, type TaskWithRelations } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DelayedTooltip } from "@/components/ui/delayed-tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TASK_DRAG_MIME, type TaskDragPayload } from "@/components/day/day-timeline-types";
import {
  loadTaskSortMode,
  moveTaskToIndex,
  saveTaskSortMode,
  sortTasks,
  TASK_REORDER_MIME,
  type TaskSortMode,
} from "@/lib/task-order";

type DayTaskPanelProps = {
  onDragStart: () => void;
  onDragEnd: () => void;
  activeTaskIds: Set<string>;
  pendingTaskId?: string | null;
  onQuickToggle: (task: TaskWithRelations) => void;
};

export function DayTaskPanel({
  onDragStart,
  onDragEnd,
  activeTaskIds,
  pendingTaskId,
  onQuickToggle,
}: DayTaskPanelProps) {
  const qc = useQueryClient();
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<TaskSortMode>(() => loadTaskSortMode());
  const [reorderingTaskId, setReorderingTaskId] = useState<string | null>(null);
  const [activeDropIndex, setActiveDropIndex] = useState<number | null>(null);

  const manualOrder = sortMode === "manual";
  const showDropZones = manualOrder && reorderingTaskId !== null;

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", projectFilter],
    queryFn: () =>
      api.listTasks(
        projectFilter === "all" ? undefined : { projectId: projectFilter },
      ),
  });

  const reorderTasks = useMutation({
    mutationFn: (taskIds: string[]) => api.reorderTasks(taskIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const activeTasks = useMemo(() => {
    const filtered = tasks.filter((t) => t.status !== TaskStatus.DONE);
    return sortTasks(filtered, sortMode);
  }, [tasks, sortMode]);

  function handleSortModeChange(value: TaskSortMode) {
    setSortMode(value);
    saveTaskSortMode(value);
  }

  function finishReorderDrag() {
    setReorderingTaskId(null);
    setActiveDropIndex(null);
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

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold leading-none tracking-tight">Tasks</h3>
        <div className="flex items-center gap-1">
          <Popover>
            <DelayedTooltip label="Filter by project">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={projectFilter !== "all" ? "default" : "outline"}
                  aria-label="Filter by project"
                >
                  <Briefcase className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </DelayedTooltip>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">Project</p>
              <div className="max-h-52 space-y-0.5 overflow-y-auto">
                <ProjectFilterOption
                  label="All projects"
                  active={projectFilter === "all"}
                  onSelect={() => setProjectFilter("all")}
                />
                {projects.map((project) => (
                  <ProjectFilterOption
                    key={project.id}
                    label={project.name}
                    active={projectFilter === project.id}
                    onSelect={() => setProjectFilter(project.id)}
                  />
                ))}
              </div>
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
          <div className={cn("flex flex-col", !manualOrder && "gap-1.5")}>
            {activeTasks.map((task, index) => (
              <Fragment key={task.id}>
                {manualOrder && (
                  <ReorderDropZone
                    insertIndex={index}
                    interactive={showDropZones}
                    active={activeDropIndex === index}
                    onActivate={() => setActiveDropIndex(index)}
                    onDeactivate={() =>
                      setActiveDropIndex((current) => (current === index ? null : current))
                    }
                    onDrop={(draggedTaskId) => {
                      setActiveDropIndex(null);
                      handleInsertAt(index, draggedTaskId);
                    }}
                  />
                )}
                <TaskRow
                  task={task}
                  isActive={activeTaskIds.has(task.id)}
                  isPending={pendingTaskId === task.id}
                  isDragging={reorderingTaskId === task.id}
                  manualOrder={manualOrder}
                  onDragStart={onDragStart}
                  onReorderDragStart={() => {
                    setReorderingTaskId(task.id);
                    setActiveDropIndex(null);
                  }}
                  onDragEnd={finishReorderDrag}
                  onQuickToggle={onQuickToggle}
                />
              </Fragment>
            ))}
            {manualOrder && (
              <ReorderDropZone
                insertIndex={activeTasks.length}
                interactive={showDropZones}
                active={activeDropIndex === activeTasks.length}
                onActivate={() => setActiveDropIndex(activeTasks.length)}
                onDeactivate={() =>
                  setActiveDropIndex((current) =>
                    current === activeTasks.length ? null : current,
                  )
                }
                onDrop={(draggedTaskId) => {
                  setActiveDropIndex(null);
                  handleInsertAt(activeTasks.length, draggedTaskId);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectFilterOption({
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

function ReorderDropZone({
  insertIndex,
  interactive,
  active,
  onActivate,
  onDeactivate,
  onDrop,
}: {
  insertIndex: number;
  interactive: boolean;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onDrop: (draggedTaskId: string) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex h-3.5 shrink-0 items-center",
        !interactive && "pointer-events-none",
      )}
      onDragOver={(e) => {
        if (!interactive || !e.dataTransfer.types.includes(TASK_REORDER_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onActivate();
      }}
      onDragLeave={onDeactivate}
      onDrop={(e) => {
        if (!interactive) return;
        const draggedTaskId = e.dataTransfer.getData(TASK_REORDER_MIME);
        if (!draggedTaskId) return;
        e.preventDefault();
        e.stopPropagation();
        onDrop(draggedTaskId);
      }}
    >
      {interactive ? (
        <div
          className={cn(
            "flex h-full w-full items-center rounded-sm border border-dashed px-1 transition-colors",
            active
              ? "border-primary bg-primary/10"
              : "border-border/60 bg-muted/30",
          )}
        >
          <div
            className={cn(
              "h-0.5 w-full rounded-full transition-colors",
              active ? "bg-primary" : "bg-border/70",
            )}
          />
        </div>
      ) : null}
      <span className="sr-only">Drop to position {insertIndex + 1}</span>
    </div>
  );
}

function TaskRow({
  task,
  isActive,
  isPending,
  isDragging,
  manualOrder,
  onDragStart,
  onReorderDragStart,
  onDragEnd,
  onQuickToggle,
}: {
  task: TaskWithRelations;
  isActive: boolean;
  isPending: boolean;
  isDragging: boolean;
  manualOrder: boolean;
  onDragStart: () => void;
  onReorderDragStart: () => void;
  onDragEnd: () => void;
  onQuickToggle: (task: TaskWithRelations) => void;
}) {
  const payload: TaskDragPayload = {
    taskId: task.id,
    projectId: task.projectId,
    title: task.title,
  };

  return (
    <div
      className={cn(
        "flex w-full items-start gap-1 rounded-md border bg-background px-1.5 py-1.5 text-sm shadow-sm",
        "hover:border-primary/40 hover:bg-muted/30",
        isActive && "border-emerald-500/40 bg-emerald-500/5",
        isDragging && "opacity-40",
      )}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(TASK_DRAG_MIME, JSON.stringify(payload));
          if (manualOrder) {
            e.dataTransfer.setData(TASK_REORDER_MIME, task.id);
          }
          e.dataTransfer.effectAllowed = manualOrder ? "copyMove" : "copy";
          if (manualOrder) onReorderDragStart();
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className={cn(
          "mt-0.5 shrink-0 cursor-grab rounded p-1 text-muted-foreground",
          "hover:bg-muted/60 active:cursor-grabbing",
        )}
        title={manualOrder ? "Drag to reorder or drop on timeline" : "Drag to timeline"}
        aria-label={manualOrder ? "Drag to reorder or timeline" : "Drag task to timeline"}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="truncate font-medium">{task.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {task.externalId ? `${task.externalId} · ` : ""}
          {task.project?.name}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "mt-0.5 h-7 w-7 shrink-0",
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
}
