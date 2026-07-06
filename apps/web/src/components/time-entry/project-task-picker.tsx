import { useMemo } from "react";
import { Briefcase, ListTodo } from "lucide-react";
import type { TaskWithRelations } from "@timefairy/shared-types";
import { InlineTaskAdd } from "@/components/tasks/inline-task-add";
import { IconSearchPicker } from "@/components/pickers/icon-search-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePinnedProjects } from "@/hooks/use-pinned-projects";
import { findTaskByReference } from "@/lib/task-reference";
import { cn } from "@/lib/utils";

type ProjectOption = {
  id: string;
  name: string;
  color?: string;
  client?: { name: string } | null;
};

type Props = {
  projects: ProjectOption[];
  tasks: Pick<TaskWithRelations, "id" | "title" | "externalId">[];
  projectId?: string;
  taskId?: string;
  taskReference?: string;
  onProjectChange: (projectId: string | undefined) => void;
  onTaskChange: (taskId: string | undefined) => void;
  onTaskReferenceChange?: (reference: string) => void;
  onTaskCreated?: (task: TaskWithRelations) => void;
  projectOptional?: boolean;
  className?: string;
};

export function ProjectTaskPicker({
  projects,
  tasks,
  projectId,
  taskId,
  taskReference = "",
  onProjectChange,
  onTaskChange,
  onTaskReferenceChange,
  onTaskCreated,
  projectOptional = false,
  className,
}: Props) {
  const { pinnedIdSet, togglePin, sortProjects } = usePinnedProjects();

  const projectItems = useMemo(
    () =>
      sortProjects(projects).map((p) => ({
        id: p.id,
        label: p.name,
        hint: p.client?.name,
        color: p.color,
      })),
    [projects, sortProjects],
  );

  const taskItems = useMemo(
    () =>
      tasks.map((t) => ({
        id: t.id,
        label: t.title,
        hint: t.externalId ?? undefined,
      })),
    [tasks],
  );

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedTask = tasks.find((t) => t.id === taskId);

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {projectOptional ? "No projects — you can still save without one." : "Add a project first."}
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-muted-foreground">
        {projectOptional ? "Project & task (optional)" : "Project & task"}
      </Label>
      <div className="flex items-center gap-2">
        <IconSearchPicker
          icon={Briefcase}
          title="Project"
          items={projectItems}
          value={projectId}
          accentColor={selectedProject?.color}
          onChange={(id) => {
            if (id) onProjectChange(id);
            else if (projectOptional) {
              onProjectChange(undefined);
              onTaskChange(undefined);
              onTaskReferenceChange?.("");
            }
          }}
          allowClear={projectOptional}
          clearLabel="No project"
          searchPlaceholder="Search projects…"
          pinnedIds={pinnedIdSet}
          onTogglePin={togglePin}
        />
        <IconSearchPicker
          icon={ListTodo}
          title="Task"
          items={taskItems}
          value={taskId}
          onChange={(id) => {
            onTaskChange(id);
            if (id) {
              const task = tasks.find((t) => t.id === id);
              if (task?.externalId) onTaskReferenceChange?.(task.externalId);
            } else {
              onTaskReferenceChange?.("");
            }
          }}
          disabled={!projectId}
          allowClear
          clearLabel="No task"
          searchPlaceholder="Search tasks…"
          footer={
            projectId ? (
              <InlineTaskAdd
                projectId={projectId}
                variant="compact"
                onCreated={(task) => {
                  onTaskCreated?.(task);
                  onTaskChange(task.id);
                  if (task.externalId) onTaskReferenceChange?.(task.externalId);
                }}
              />
            ) : undefined
          }
        />
        <div className="min-w-0 flex-1 text-sm leading-snug">
          <span className="font-medium truncate block">
            {selectedProject?.name ?? (projectOptional ? "No project" : "Select project")}
          </span>
          <span className="text-muted-foreground truncate block text-xs">
            {projectId
              ? selectedTask
                ? selectedTask.externalId
                  ? `${selectedTask.externalId} · ${selectedTask.title}`
                  : selectedTask.title
                : "No task"
              : projectOptional
                ? "Optional"
                : "Pick a project"}
          </span>
        </div>
      </div>
      {projectId && onTaskReferenceChange && (
        <div className="space-y-1.5 pl-0.5">
          <Label htmlFor="task-reference" className="text-xs font-normal text-muted-foreground">
            Task reference (optional)
          </Label>
          <Input
            id="task-reference"
            value={taskReference}
            onChange={(e) => {
              const value = e.target.value;
              onTaskReferenceChange(value);
              const match = findTaskByReference(tasks, value);
              onTaskChange(match?.id);
            }}
            placeholder="e.g. JIRA-123"
            className="h-8 font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Ticket or external ID — matches a task in this project or creates one when you save.
          </p>
        </div>
      )}
    </div>
  );
}
