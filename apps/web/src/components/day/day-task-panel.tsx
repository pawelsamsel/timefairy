import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { TaskStatus, type TaskWithRelations } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_DRAG_MIME, type TaskDragPayload } from "@/components/day/day-timeline-types";

type DayTaskPanelProps = {
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function DayTaskPanel({ onDragStart, onDragEnd }: DayTaskPanelProps) {
  const [projectFilter, setProjectFilter] = useState<string>("all");

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

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== TaskStatus.DONE),
    [tasks],
  );

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="mb-3 flex w-full items-center gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mb-2 text-xs text-muted-foreground">
        Drag onto the timeline. Quick drop = free block under cursor. Hold ~0.6s on an hour for shorter slot options.
      </p>

      <div className="min-h-0 w-full flex-1 space-y-1.5 overflow-y-auto pr-1">
        {isLoading && (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading tasks…</p>
        )}
        {!isLoading && activeTasks.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No active tasks.</p>
        )}
        {activeTasks.map((task) => (
          <DraggableTaskRow
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableTaskRow({
  task,
  onDragStart,
  onDragEnd,
}: {
  task: TaskWithRelations;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const payload: TaskDragPayload = {
    taskId: task.id,
    projectId: task.projectId,
    title: task.title,
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_MIME, JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "copy";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex w-full cursor-grab items-start gap-2 rounded-md border bg-background px-2 py-2 text-sm shadow-sm",
        "active:cursor-grabbing hover:border-primary/40 hover:bg-muted/30",
      )}
    >
      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{task.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {task.externalId ? `${task.externalId} · ` : ""}
          {task.project?.name}
        </div>
      </div>
    </div>
  );
}
