import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TaskStatus } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
import { formatTimeRange } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  focusName?: boolean;
  defaultProjectId?: string;
  clientId?: string;
};

export function TaskDetailsDialog({
  open,
  onOpenChange,
  taskId,
  focusName = false,
  defaultProjectId,
  clientId,
}: Props) {
  const qc = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const isEdit = taskId != null;

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
    enabled: open,
  });

  const { data: taskDetail, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api.getTask(taskId!),
    enabled: open && isEdit,
  });

  const visibleProjects = useMemo(() => {
    const base = clientId ? projects.filter((p) => p.clientId === clientId) : projects;
    if (taskDetail && !base.some((p) => p.id === taskDetail.projectId)) {
      const current = projects.find((p) => p.id === taskDetail.projectId);
      return current ? [...base, current] : base;
    }
    return base;
  }, [projects, clientId, taskDetail]);

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [externalId, setExternalId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setNameEditing(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && taskDetail) {
      setTitle(taskDetail.title);
      setProjectId(taskDetail.projectId);
      setExternalId(taskDetail.externalId ?? "");
      setExternalUrl(taskDetail.externalUrl ?? "");
      setStatus(taskDetail.status);
      setNote(taskDetail.note ?? "");
      setNameEditing(focusName);
    } else if (!isEdit) {
      setTitle("");
      const preferred =
        defaultProjectId && visibleProjects.some((p) => p.id === defaultProjectId)
          ? defaultProjectId
          : visibleProjects[0]?.id ?? "";
      setProjectId(preferred);
      setExternalId("");
      setExternalUrl("");
      setStatus(TaskStatus.TODO);
      setNote("");
      setNameEditing(true);
    }
    setError("");
  }, [open, isEdit, taskDetail, focusName, defaultProjectId, visibleProjects]);

  useEffect(() => {
    if (nameEditing) nameInputRef.current?.focus();
  }, [nameEditing]);

  function cancelNameEdit() {
    if (taskDetail) setTitle(taskDetail.title);
    setNameEditing(false);
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["time-entries"] });
    if (taskId) qc.invalidateQueries({ queryKey: ["task", taskId] });
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        projectId,
        externalId: externalId.trim() || undefined,
        externalUrl: externalUrl.trim() || undefined,
        status,
        note: note.trim() || undefined,
      };
      if (isEdit) return api.updateTask(taskId!, payload);
      return api.createTask(payload);
    },
    onSuccess: () => {
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteTask(taskId!),
    onSuccess: () => {
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => {
      void alert({
        title: "Delete failed",
        description: getErrorMessage(err),
        variant: "error",
      });
    },
  });

  async function handleDelete() {
    const name = taskDetail?.title ?? title;
    const ok = await confirm({
      title: "Delete task",
      description: `Delete task "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) remove.mutate();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Name is required.");
      return;
    }
    save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>Name, project, external link, status, and notes.</DialogDescription>
        </DialogHeader>

        {isEdit && isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isEdit && !taskDetail ? null : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="task-name">Name</Label>
              {isEdit && !nameEditing ? (
                <div className="flex items-center gap-2 rounded-lg border border-imperial-blue-200 bg-imperial-blue-50/60 px-3 py-2">
                  <span className="flex-1 font-medium text-imperial-blue truncate">
                    {title || taskDetail?.title}
                  </span>
                  <Button
                    type="button"
                    variant="dialogOutline"
                    size="sm"
                    onClick={() => setNameEditing(true)}
                  >
                    Edit
                  </Button>
                </div>
              ) : (
                <Input
                  ref={nameInputRef}
                  id="task-name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  onKeyDown={(e) => {
                    if (isEdit && e.key === "Escape") cancelNameEdit();
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibleProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.client?.name ? ` · ${p.client.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="task-ext-id">External ID</Label>
                <Input
                  id="task-ext-id"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="JIRA-123"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TaskStatus.TODO}>To do</SelectItem>
                    <SelectItem value={TaskStatus.IN_PROGRESS}>In progress</SelectItem>
                    <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-ext-url">External link</Label>
              <Input
                id="task-ext-url"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-note">Note</Label>
              <Textarea id="task-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>

            {isEdit && taskDetail && taskDetail.timeEntries.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="text-muted-foreground">
                  Linked time entries ({taskDetail._count?.timeEntries ?? taskDetail.timeEntries.length})
                </Label>
                <ul className="max-h-40 overflow-y-auto divide-y divide-border/40 rounded-lg bg-muted/30">
                  {taskDetail.timeEntries.map((e) => (
                    <li key={e.id} className="px-3 py-2 text-sm">
                      <div className="font-medium">
                        {formatTimeRange(e.startAt, e.endAt, e.durationMinutes)}
                      </div>
                      {e.note && <div className="text-muted-foreground text-xs">{e.note}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => void handleDelete()}
                  disabled={remove.isPending || save.isPending}
                >
                  Delete
                </Button>
              )}
              <Button type="button" variant="dialogOutline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending || !projectId}>
                {save.isPending ? "Saving…" : isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
