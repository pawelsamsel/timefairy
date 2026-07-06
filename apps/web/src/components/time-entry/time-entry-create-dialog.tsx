import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EntrySource } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import {
  defaultStartLocal,
  localDatetimeToIso,
  toDatetimeLocalValue,
} from "@/lib/datetime";
import { formatTaskReference } from "@/lib/entry-display";
import { getErrorMessage } from "@/lib/errors";
import { useIsMobileLayout } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { resolveTaskIdForEntry } from "@/lib/task-reference";
import {
  type EntryFormKind,
  findEventsLaneId,
  findLoggedLaneId,
} from "@/lib/time-entry-kind";
import { useTimeEntryUndo } from "@/lib/undo/undo-context";
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

export type TimeEntryCreateInitial = {
  kind?: EntryFormKind;
  laneId?: string;
  projectId?: string;
  taskId?: string;
  startAt?: string;
  useEndTime?: boolean;
  endAt?: string;
  title?: string;
  note?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  initialValues?: TimeEntryCreateInitial;
};

export function TimeEntryCreateDialog({
  open,
  onOpenChange,
  selectedDate,
  initialValues,
}: Props) {
  const qc = useQueryClient();
  const timeEntryUndo = useTimeEntryUndo();
  const isMobile = useIsMobileLayout();
  const formId = "time-entry-create-form";
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<EntryFormKind>("block");
  const [laneId, setLaneId] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [taskId, setTaskId] = useState<string | undefined>();
  const [taskReference, setTaskReference] = useState("");
  const [startAt, setStartAt] = useState("");
  const [useEndTime, setUseEndTime] = useState(false);
  const [endAt, setEndAt] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

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
  const titlePlaceholder =
    kind === "event"
      ? "e.g. Took medication, blood pressure 120/80"
      : selectedTask
        ? formatTaskReference(selectedTask)
        : "What did you work on?";

  useEffect(() => {
    if (!open) return;

    const defaults: TimeEntryCreateInitial = {
      kind: "block",
      startAt: defaultStartLocal(selectedDate),
      useEndTime: false,
      endAt: "",
      title: "",
      note: "",
    };
    const next = { ...defaults, ...initialValues };

    setKind(next.kind ?? "block");
    setLaneId(next.laneId);
    setProjectId(next.projectId);
    setTaskId(next.taskId);
    setTaskReference("");
    setStartAt(next.startAt ?? defaultStartLocal(selectedDate));
    setUseEndTime(next.useEndTime ?? false);
    setEndAt(next.endAt ?? "");
    setTitle(next.title ?? "");
    setNote(next.note ?? "");
    setError("");
  }, [open, selectedDate, initialValues]);

  useEffect(() => {
    if (!open || lanes.length === 0) return;
    if (kind === "event") {
      setLaneId(findEventsLaneId(lanes) ?? laneId);
      return;
    }
    if (!laneId || lanes.find((l) => l.id === laneId)?.type === "EVENTS") {
      setLaneId(findLoggedLaneId(lanes));
    }
  }, [open, kind, lanes, laneId]);

  useEffect(() => {
    if (!open || kind !== "block" || projectId || projects.length === 0) return;
    setProjectId(projects[0].id);
  }, [open, kind, projects, projectId]);

  useEffect(() => {
    if (!taskId) return;
    const task = projectTasks.find((t) => t.id === taskId);
    if (task?.externalId && task.externalId !== taskReference) {
      setTaskReference(task.externalId);
    }
  }, [projectTasks, taskId, taskReference]);

  useEffect(() => {
    if (taskId && !projectTasks.some((t) => t.id === taskId)) {
      setTaskId(undefined);
    }
  }, [projectTasks, taskId]);

  useEffect(() => {
    if (!open) return;

    function handleSaveShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      event.preventDefault();
      formRef.current?.requestSubmit();
    }

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [open]);

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!laneId) throw new Error("Select a lane");
      if (kind === "block" && !projectId) throw new Error("Select a project");

      const resolvedTaskId = await resolveTaskIdForEntry({
        projectId,
        taskId,
        taskReference,
        title,
        knownTasks: projectTasks,
      });

      const base = {
        laneId,
        projectId: projectId || undefined,
        taskId: resolvedTaskId,
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        source: EntrySource.WEB,
      };

      if (kind === "event") {
        if (!title.trim() && !resolvedTaskId) {
          throw new Error("Enter a name for the event");
        }
        const startIso = localDatetimeToIso(startAt);
        return api.createTimeEntry({
          ...base,
          startAt: startIso,
        });
      }

      const startIso = localDatetimeToIso(startAt);
      const payload: Parameters<typeof api.createTimeEntry>[0] = {
        ...base,
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
    },
    onSuccess: (created) => {
      timeEntryUndo.pushCreateUndo(created.id);
      qc.invalidateQueries({ queryKey: ["time-entries"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err, "Failed to save entry")),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (kind === "block" && !projectId) {
      setError("Select a project");
      return;
    }
    if (!laneId) {
      setError("Select a lane");
      return;
    }
    if (kind === "block" && useEndTime && !endAt) {
      setError("Set end time or disable end time");
      return;
    }
    createEntry.mutate();
  }

  function switchKind(next: EntryFormKind) {
    setKind(next);
    setError("");
    if (next === "event") {
      setUseEndTime(false);
      setEndAt("");
      setLaneId(findEventsLaneId(lanes) ?? laneId);
    } else {
      setLaneId(findLoggedLaneId(lanes) ?? laneId);
    }
  }

  const canSubmit =
    !!laneId &&
    lanes.length > 0 &&
    (kind === "event" || !!projectId) &&
    (kind === "event" || projects.length > 0);

  const description =
    kind === "event"
      ? "A moment in time (no duration). Optional project, e.g. Health."
      : "Time block with start and optional end on a work lane.";

  const formFields = (
    <>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={kind === "block" ? "default" : "outline"}
          onClick={() => switchKind("block")}
        >
          Time block
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === "event" ? "default" : "outline"}
          onClick={() => switchKind("event")}
        >
          Event
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="createTitle">{kind === "event" ? "What happened" : "Name"}</Label>
        <Input
          id="createTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          required={kind === "event" && !taskId}
        />
      </div>

      {kind === "block" && (
        <div className="space-y-2">
          <Label>Lane</Label>
          {lanes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lanes configured.</p>
          ) : (
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
          )}
        </div>
      )}

      <ProjectTaskPicker
        projects={projects}
        tasks={projectTasks}
        projectId={projectId}
        taskId={taskId}
        taskReference={taskReference}
        projectOptional={kind === "event"}
        onProjectChange={setProjectId}
        onTaskChange={setTaskId}
        onTaskReferenceChange={setTaskReference}
        onTaskCreated={(task) => {
          setTaskId(task.id);
          if (task.externalId) setTaskReference(task.externalId);
        }}
      />

      <DateTimeField
        id="createStartAt"
        label={kind === "event" ? "When" : "Start"}
        value={startAt}
        onChange={setStartAt}
        required
      />

      {kind === "block" && (
        <>
          <div className="flex items-center gap-2">
            <Checkbox
              id="createUseEnd"
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
            <Label htmlFor="createUseEnd" className="cursor-pointer font-normal">
              Set end time
            </Label>
          </div>
          {useEndTime && (
            <DateTimeField
              id="createEndAt"
              label="End"
              value={endAt}
              min={startAt}
              onChange={setEndAt}
              required
            />
          )}
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="createNote">Note</Label>
        <Textarea id="createNote" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );

  const formFooter = (
    <DialogFooter
      className={cn(
        "gap-2 sm:justify-end",
        isMobile &&
          "-mx-0 mt-0 shrink-0 flex-row justify-end rounded-none border-t border-border/40 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button
        type="submit"
        form={isMobile ? formId : undefined}
        disabled={createEntry.isPending || !canSubmit}
      >
        {createEntry.isPending ? "Saving…" : "Add log"}
      </Button>
    </DialogFooter>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        preventOutsideClose
        fullscreen={isMobile}
        className={cn(isMobile && "flex flex-col", !isMobile && "max-w-md")}
      >
        {isMobile ? (
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <DialogHeader className="shrink-0 space-y-1 border-b border-border/40 px-4 pb-3 pt-4 text-left">
              <DialogTitle className="text-foreground">Add log</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <form id={formId} ref={formRef} onSubmit={onSubmit} className="space-y-4">
                {formFields}
              </form>
            </div>
            {formFooter}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add log</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
              {formFields}
              {formFooter}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
