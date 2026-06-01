import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskWithRelations } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  task: Pick<TaskWithRelations, "id" | "title">;
  className?: string;
  inlineEdit?: boolean;
};

export function InlineTaskTitle({ task, className, inlineEdit = false }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setValue(task.title);
  }, [task.title, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const update = useMutation({
    mutationFn: (title: string) => api.updateTask(task.id, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditing(false);
    },
  });

  function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === task.title) {
      setValue(task.title);
      setEditing(false);
      return;
    }
    update.mutate(trimmed);
  }

  if (!inlineEdit) {
    return (
      <span className={cn("font-medium text-sm truncate block max-w-full", className)}>
        {task.title}
      </span>
    );
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setValue(task.title);
            setEditing(false);
          }
        }}
        disabled={update.isPending}
        className={cn("h-8 font-medium", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "text-left font-medium text-sm hover:text-primary transition-colors truncate max-w-full",
        className,
      )}
      title="Click to edit title"
    >
      {task.title}
    </button>
  );
}
