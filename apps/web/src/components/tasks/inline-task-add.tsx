import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { TaskStatus, type TaskWithRelations } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { usePinnedProjects } from "@/hooks/use-pinned-projects";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  projectId?: string;
  projectName?: string;
  projects?: Array<{ id: string; name: string }>;
  showProjectSelect?: boolean;
  defaultProjectId?: string;
  onCreated?: (task: TaskWithRelations) => void;
  className?: string;
  variant?: "inline" | "compact";
  disabled?: boolean;
  disabledHint?: string;
};

export function InlineTaskAdd({
  projectId: fixedProjectId,
  projectName,
  projects: projectsOverride,
  showProjectSelect = false,
  defaultProjectId,
  onCreated,
  className,
  variant = "inline",
  disabled = false,
  disabledHint = "Create a project first",
}: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(
    fixedProjectId ?? defaultProjectId ?? "",
  );
  const [error, setError] = useState("");

  const { data: fetchedProjects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
    enabled: showProjectSelect && !fixedProjectId && projectsOverride == null,
  });

  const projects = projectsOverride ?? fetchedProjects;
  const { sortProjects } = usePinnedProjects();
  const sortedProjects = useMemo(() => sortProjects(projects), [projects, sortProjects]);

  const effectiveProjectId = fixedProjectId ?? projectId;

  useEffect(() => {
    if (fixedProjectId) return;
    if (defaultProjectId) setProjectId(defaultProjectId);
  }, [fixedProjectId, defaultProjectId]);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  const create = useMutation({
    mutationFn: () =>
      api.createTask({
        projectId: effectiveProjectId,
        title: title.trim(),
        status: TaskStatus.TODO,
      }),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setTitle("");
      setError("");
      setActive(false);
      onCreated?.(task);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !effectiveProjectId) return;
    setError("");
    create.mutate();
  }

  function collapse() {
    setActive(false);
    setTitle("");
    setError("");
  }

  const resolvedProjectName =
    projectName ??
    projects.find((p) => p.id === effectiveProjectId)?.name ??
    "project";

  if (variant === "inline") {
    if (!active) {
      return (
        <button
          type="button"
          disabled={disabled || !effectiveProjectId}
          onClick={() => setActive(true)}
          className={cn(
            "flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground",
            "border-b border-border/40 transition-colors",
            "hover:bg-muted/20 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>
            {disabled || !effectiveProjectId
              ? disabledHint
              : `Add task to "${resolvedProjectName}"`}
          </span>
        </button>
      );
    }

    return (
      <form
        onSubmit={onSubmit}
        className={cn(
          "border-b border-border/40 bg-muted/10 px-4 py-2 space-y-1",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          {showProjectSelect && !fixedProjectId && (
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-[160px] shrink-0">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                {sortedProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task name…"
            disabled={create.isPending}
            className="h-8 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                collapse();
              }
            }}
            onBlur={(e) => {
              const next = e.relatedTarget as Node | null;
              if (next && e.currentTarget.form?.contains(next)) return;
              if (!title.trim()) collapse();
            }}
          />
        </div>
        {error && <p className="text-xs text-destructive px-1">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        {showProjectSelect && !fixedProjectId && (
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              {sortedProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task name…"
          className="h-8 flex-1 text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={create.isPending || !title.trim() || !effectiveProjectId}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
