import { Pencil } from "lucide-react";
import { TaskStatus, type TaskWithRelations } from "@timefairy/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { InlineTaskTitle } from "./inline-task-title";
import { TaskExternalLinks } from "./task-external-links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  task: TaskWithRelations;
  onEdit: () => void;
  showProject?: boolean;
  projectName?: string;
  layout?: "row" | "stack";
};

export function TaskRowActions({
  task,
  onEdit,
  showProject,
  projectName,
  layout = "stack",
}: Props) {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: TaskStatus) => api.updateTask(task.id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div
      className={cn(
        "group rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors",
        layout === "row" && "flex items-center gap-3",
      )}
    >
      <div className={cn("min-w-0 flex-1", layout === "row" && "flex items-center gap-3")}>
        <div className="min-w-0 flex-1">
          <InlineTaskTitle task={task} />
          {showProject && projectName && (
            <div className="text-xs text-muted-foreground mt-0.5">{projectName}</div>
          )}
          <TaskExternalLinks task={task} />
        </div>
        {layout === "row" && (
          <span className="text-xs text-muted-foreground shrink-0">
            {task._count?.timeEntries ?? 0} entries
          </span>
        )}
      </div>
      <div className={cn("flex items-center gap-2 shrink-0", layout === "stack" && "mt-2")}>
        <Select
          value={task.status}
          onValueChange={(v) => updateStatus.mutate(v as TaskStatus)}
        >
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TaskStatus.TODO}>To do</SelectItem>
            <SelectItem value={TaskStatus.IN_PROGRESS}>In progress</SelectItem>
            <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
          </SelectContent>
        </Select>
        {layout === "stack" && (
          <Badge variant="secondary" className="text-xs">
            {task._count?.timeEntries ?? 0} entries
          </Badge>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
    </div>
  );
}
