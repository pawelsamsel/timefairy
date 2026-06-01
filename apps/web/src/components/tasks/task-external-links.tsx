import { ExternalLink } from "lucide-react";
import type { TaskWithRelations } from "@timefairy/shared-types";

export function TaskExternalLinks({
  task,
}: {
  task: Pick<TaskWithRelations, "externalId" | "externalUrl" | "title">;
}) {
  if (!task.externalId && !task.externalUrl) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {task.externalId && (
        <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">{task.externalId}</span>
      )}
      {task.externalUrl && (
        <a
          href={task.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </a>
      )}
    </div>
  );
}
