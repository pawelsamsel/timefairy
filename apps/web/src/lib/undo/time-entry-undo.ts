import type {
  CreateTimeEntryInput,
  TimeEntry,
  TimeEntryWithRelations,
  UpdateTimeEntryInput,
} from "@timefairy/shared-types";
import { api } from "@/lib/api";
import type { PushUndoFn } from "./undo-context";

export function snapshotForUpdate(entry: TimeEntryWithRelations): UpdateTimeEntryInput {
  return {
    laneId: entry.laneId,
    projectId: entry.projectId ?? undefined,
    taskId: entry.taskId ?? undefined,
    clientId: entry.clientId ?? undefined,
    startAt: entry.startAt ?? undefined,
    endAt: entry.endAt ?? undefined,
    durationMinutes: entry.durationMinutes ?? undefined,
    title: entry.title ?? undefined,
    note: entry.note ?? undefined,
  };
}

export function snapshotForRestore(
  entry: Pick<
    TimeEntry,
    | "laneId"
    | "taskId"
    | "projectId"
    | "clientId"
    | "startAt"
    | "endAt"
    | "durationMinutes"
    | "title"
    | "note"
    | "source"
  >,
): CreateTimeEntryInput {
  return {
    laneId: entry.laneId,
    projectId: entry.projectId ?? undefined,
    taskId: entry.taskId ?? undefined,
    clientId: entry.clientId ?? undefined,
    startAt: entry.startAt ?? undefined,
    endAt: entry.endAt ?? undefined,
    durationMinutes: entry.durationMinutes ?? undefined,
    title: entry.title ?? undefined,
    note: entry.note ?? undefined,
    source: entry.source,
  };
}

export function pushCreateUndo(pushUndo: PushUndoFn, entryId: string) {
  pushUndo({
    label: "Add entry",
    run: () => api.deleteTimeEntry(entryId),
  });
}

export function pushUpdateUndo(
  pushUndo: PushUndoFn,
  entryId: string,
  before: UpdateTimeEntryInput,
) {
  pushUndo({
    label: "Edit entry",
    run: () => api.updateTimeEntry(entryId, before),
  });
}

export function pushDeleteUndo(pushUndo: PushUndoFn, entry: TimeEntryWithRelations) {
  const restore = snapshotForRestore(entry);
  pushUndo({
    label: "Delete entry",
    run: () => api.createTimeEntry(restore),
  });
}
