import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2 } from "lucide-react";
import { EntrySource, type TimeEntryWithRelations } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
import { useIsMobileLayout } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { snapshotForUpdate } from "@/lib/undo/time-entry-undo";
import { useTimeEntryUndo } from "@/lib/undo/undo-context";
import {
  isoToDatetimeLocal,
  localDatetimeToIso,
  toDatetimeLocalValue,
} from "@/lib/datetime";
import { formatTaskReference } from "@/lib/entry-display";
import { resolveTaskIdForEntry } from "@/lib/task-reference";
import {
  type EntryFormKind,
  entryFormKindFromEntry,
  findEventsLaneId,
  findLoggedLaneId,
} from "@/lib/time-entry-kind";
import { DateTimeField } from "@/components/datetime-field";
import { ProjectTaskPicker } from "@/components/time-entry/project-task-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntryWithRelations | null;
};

export function TimeEntryEditDialog({ open, onOpenChange, entry }: Props) {
  const qc = useQueryClient();
  const timeEntryUndo = useTimeEntryUndo();
  const { confirm } = useAppDialog();
  const isMobile = useIsMobileLayout();
  const formId = "time-entry-edit-form";
  const [laneId, setLaneId] = useState<string>("");
  const [projectId, setProjectId] = useState<string | undefined>();
  const [taskId, setTaskId] = useState<string | undefined>();
  const [taskReference, setTaskReference] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [durationHours, setDurationHours] = useState("1");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [formKind, setFormKind] = useState<EntryFormKind | "duration">("block");
  const [useEndTime, setUseEndTime] = useState(false);

  const lanesQuery = useQuery({
    queryKey: ["lanes"],
    queryFn: () => api.listLanes(),
    enabled: open,
  });
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
    enabled: open,
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => api.listTasks({ projectId: projectId! }),
    enabled: open && !!projectId,
  });

  const lanes = lanesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const projectTasks = tasksQuery.data ?? [];
  const selectedTask = projectTasks.find((task) => task.id === taskId);
  const titlePlaceholder = selectedTask
    ? formatTaskReference(selectedTask)
    : "What did you work on?";

  useEffect(() => {
    if (!open || !entry) return;
    setLaneId(entry.laneId);
    setProjectId(entry.projectId ?? undefined);
    setTaskId(entry.taskId ?? undefined);
    setTaskReference(entry.task?.externalId ?? "");
    setTitle(entry.title ?? "");
    setNote(entry.note ?? "");
    setError("");
    const kind = entryFormKindFromEntry(entry);
    setFormKind(kind);
    if (kind === "event") {
      setStartAt(isoToDatetimeLocal(entry.startAt!));
      setEndAt("");
      setUseEndTime(false);
      setDurationHours("1");
    } else if (kind === "block") {
      setStartAt(isoToDatetimeLocal(entry.startAt!));
      const hasEnd = !!entry.endAt;
      setUseEndTime(hasEnd);
      setEndAt(hasEnd ? isoToDatetimeLocal(entry.endAt!) : "");
    } else {
      setStartAt("");
      setEndAt("");
      setUseEndTime(false);
      setDurationHours(((entry.durationMinutes ?? 60) / 60).toString());
    }
  }, [open, entry]);

  useEffect(() => {
    if (!taskId) return;
    const task = projectTasks.find((t) => t.id === taskId);
    if (task?.externalId && task.externalId !== taskReference) {
      setTaskReference(task.externalId);
    }
  }, [projectTasks, taskId, taskReference]);

  useEffect(() => {
    if (!taskId || projectTasks.some((t) => t.id === taskId)) return;
    if (entry?.taskId === taskId && entry.task) return;
    setTaskId(undefined);
  }, [projectTasks, taskId, entry]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["time-entries"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error("No entry");
      if (!laneId) throw new Error("Select a lane");
      if (formKind === "block" && !projectId) throw new Error("Select a project");

      const before = snapshotForUpdate(entry);
      const resolvedTaskId = await resolveTaskIdForEntry({
        projectId,
        taskId,
        taskReference,
        title,
        knownTasks: projectTasks,
      });
      const entryFields = {
        laneId,
        projectId: projectId ?? null,
        taskId: resolvedTaskId ?? null,
        title: title.trim() || undefined,
        note: note.trim() || undefined,
      };

      if (formKind === "event") {
        if (!startAt) throw new Error("Set time");
        await api.updateTimeEntry(entry.id, {
          ...entryFields,
          startAt: localDatetimeToIso(startAt),
          endAt: null,
          durationMinutes: null,
        });
      } else if (formKind === "block") {
        if (!startAt) throw new Error("Set start time");
        const startIso = localDatetimeToIso(startAt);
        const payload: Parameters<typeof api.updateTimeEntry>[1] = {
          ...entryFields,
          startAt: startIso,
          durationMinutes: null,
        };
        if (useEndTime && endAt) {
          const endIso = localDatetimeToIso(endAt);
          if (new Date(endIso) <= new Date(startIso)) {
            throw new Error("End time must be after start time");
          }
          payload.endAt = endIso;
        } else {
          payload.endAt = null;
        }
        await api.updateTimeEntry(entry.id, payload);
      } else {
        await api.updateTimeEntry(entry.id, {
          ...entryFields,
          durationMinutes: Math.round(parseFloat(durationHours) * 60),
          startAt: null,
          endAt: null,
        });
      }

      return { entryId: entry.id, before };
    },
    onSuccess: ({ entryId, before }) => {
      timeEntryUndo.pushUpdateUndo(entryId, before);
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err, "Failed to save entry")),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error("No entry");
      const deleted = entry;
      await api.deleteTimeEntry(entry.id);
      return deleted;
    },
    onSuccess: (deleted) => {
      timeEntryUndo.pushDeleteUndo(deleted);
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err, "Failed to delete entry")),
  });

  const copy = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error("No entry");
      if (!laneId) throw new Error("Select a lane");
      if (formKind === "block" && !projectId) throw new Error("Select a project");

      const resolvedTaskId = await resolveTaskIdForEntry({
        projectId,
        taskId,
        taskReference,
        title,
        knownTasks: projectTasks,
      });

      const entryFields = {
        laneId,
        projectId: projectId || undefined,
        taskId: resolvedTaskId,
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        source: EntrySource.WEB,
      };

      if (formKind === "event") {
        return api.createTimeEntry({
          ...entryFields,
          startAt: localDatetimeToIso(startAt),
        });
      }

      if (formKind === "block") {
        const startIso = localDatetimeToIso(startAt);
        const payload: Parameters<typeof api.createTimeEntry>[0] = {
          ...entryFields,
          projectId: projectId!,
          startAt: startIso,
        };
        if (useEndTime && endAt) {
          const endIso = localDatetimeToIso(endAt);
          if (new Date(endIso) <= new Date(startIso)) {
            throw new Error("End time must be after start time");
          }
          payload.endAt = endIso;
        }
        return api.createTimeEntry(payload);
      }

      return api.createTimeEntry({
        ...entryFields,
        projectId: projectId!,
        durationMinutes: Math.round(parseFloat(durationHours) * 60),
      });
    },
    onSuccess: (created) => {
      timeEntryUndo.pushCreateUndo(created.id);
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err, "Failed to copy entry")),
  });

  const actionPending = save.isPending || remove.isPending || copy.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    save.mutate();
  }

  async function handleDelete() {
    if (!entry) return;
    const name = title.trim() || entry.title || entry.task?.title || "this entry";
    const ok = await confirm({
      title: "Delete entry",
      description: `Delete "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) remove.mutate();
  }

  function switchFormKind(next: EntryFormKind | "duration") {
    setFormKind(next);
    if (next === "event") {
      setUseEndTime(false);
      setEndAt("");
      setLaneId(findEventsLaneId(lanes) ?? laneId);
      if (!startAt && entry?.startAt) {
        setStartAt(isoToDatetimeLocal(entry.startAt));
      }
    } else if (next === "block") {
      setLaneId(findLoggedLaneId(lanes) ?? laneId);
    }
  }

  const dialogTitle = formKind === "event" ? "Edit event" : "Edit entry";

  const formFields = (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={formKind === "block" ? "default" : "outline"}
          onClick={() => switchFormKind("block")}
        >
          Time block
        </Button>
        <Button
          type="button"
          size="sm"
          variant={formKind === "event" ? "default" : "outline"}
          onClick={() => switchFormKind("event")}
        >
          Event
        </Button>
        {entry && entryFormKindFromEntry(entry) === "duration" && (
          <Button
            type="button"
            size="sm"
            variant={formKind === "duration" ? "default" : "outline"}
            onClick={() => switchFormKind("duration")}
          >
            Duration only
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="editTitle">Name</Label>
        <Input
          id="editTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
        />
      </div>

      {formKind === "block" && (
        <div className="space-y-2">
          <Label>Lane</Label>
          <Select value={laneId} onValueChange={setLaneId}>
            <SelectTrigger>
              <SelectValue placeholder="Select lane" />
            </SelectTrigger>
            <SelectContent>
              {lanes
                .filter((lane) => lane.type !== "EVENTS")
                .map((lane) => (
                  <SelectItem key={lane.id} value={lane.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: lane.color }}
                      />
                      {lane.name}
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ProjectTaskPicker
        projects={projects}
        tasks={projectTasks}
        projectId={projectId}
        taskId={taskId}
        taskReference={taskReference}
        projectOptional={formKind === "event"}
        onProjectChange={(id) => {
          setProjectId(id);
          setTaskId(undefined);
          setTaskReference("");
        }}
        onTaskChange={setTaskId}
        onTaskReferenceChange={setTaskReference}
        onTaskCreated={(task) => {
          setTaskId(task.id);
          if (task.externalId) setTaskReference(task.externalId);
        }}
      />

      {formKind === "event" || formKind === "block" ? (
        <>
          <DateTimeField
            id="editStartAt"
            label={formKind === "event" ? "When" : "Start"}
            value={startAt}
            onChange={setStartAt}
            required
          />
          {formKind === "block" && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="editUseEnd"
                  checked={useEndTime}
                  onCheckedChange={(v) => {
                    const on = v === true;
                    setUseEndTime(on);
                    if (on && !endAt && startAt) {
                      const end = new Date(startAt);
                      end.setMinutes(end.getMinutes() + 60);
                      setEndAt(toDatetimeLocalValue(end));
                    }
                    if (!on) setEndAt("");
                  }}
                />
                <Label htmlFor="editUseEnd" className="cursor-pointer font-normal">
                  Set end time
                </Label>
              </div>
              {useEndTime && (
                <DateTimeField
                  id="editEndAt"
                  label="End"
                  value={endAt}
                  min={startAt}
                  onChange={setEndAt}
                  required
                />
              )}
            </>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="editDuration">Duration (hours)</Label>
          <Input
            id="editDuration"
            type="number"
            step="0.25"
            min="0.25"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="editNote">Note</Label>
        <Textarea id="editNote" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );

  const formFooter = (
    <DialogFooter
      className={cn(
        "flex-row flex-nowrap items-center justify-between gap-2 sm:justify-between [&_button]:min-w-0",
        isMobile &&
          "-mx-0 mt-0 shrink-0 rounded-none border-t border-border/40 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="destructive"
          disabled={actionPending}
          onClick={() => void handleDelete()}
          aria-label={remove.isPending ? "Deleting…" : "Delete entry"}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={actionPending || !laneId || (formKind === "block" && !projectId)}
          onClick={() => {
            setError("");
            copy.mutate();
          }}
          aria-label={copy.isPending ? "Copying…" : "Copy entry"}
          title="Copy"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 [&_button]:min-w-[5.5rem]">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" form={isMobile ? formId : undefined} disabled={actionPending || !laneId}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </DialogFooter>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        fullscreen={isMobile}
        className={cn(isMobile && "flex flex-col", !isMobile && "max-w-md max-h-[90vh] overflow-y-auto")}
      >
        {isMobile ? (
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <DialogHeader className="shrink-0 space-y-1 border-b border-border/40 px-4 pb-3 pt-4 text-left">
              <DialogTitle className="text-foreground">{dialogTitle}</DialogTitle>
              <DialogDescription>Change project, name, time, or note.</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <form id={formId} onSubmit={onSubmit} className="space-y-4">
                {formFields}
              </form>
            </div>
            {formFooter}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>Change project, name, time, or note.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              {formFields}
              {formFooter}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
