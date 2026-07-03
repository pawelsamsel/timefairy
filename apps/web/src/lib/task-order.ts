import type { TaskWithRelations } from "@timefairy/shared-types";

export type TaskSortMode = "manual" | "recent" | "name";

export const TASK_SORT_MODE_KEY = "timefairy-task-sort-mode";

export const TASK_REORDER_MIME = "application/x-timefairy-task-reorder";

export function loadTaskSortMode(): TaskSortMode {
  const stored = localStorage.getItem(TASK_SORT_MODE_KEY);
  if (stored === "recent" || stored === "name") return stored;
  return "manual";
}

export function saveTaskSortMode(mode: TaskSortMode) {
  localStorage.setItem(TASK_SORT_MODE_KEY, mode);
}

export function sortTasks(tasks: TaskWithRelations[], mode: TaskSortMode): TaskWithRelations[] {
  const copy = [...tasks];
  if (mode === "name") {
    return copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }
  if (mode === "recent") {
    return copy.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }
  return copy.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function moveTaskToIndex(ids: string[], draggedId: string, insertIndex: number): string[] | null {
  const from = ids.indexOf(draggedId);
  if (from === -1) return null;

  const clamped = Math.min(Math.max(insertIndex, 0), ids.length);
  if (from === clamped || from + 1 === clamped) return null;

  const next = [...ids];
  next.splice(from, 1);
  const target = from < clamped ? clamped - 1 : clamped;
  next.splice(target, 0, draggedId);
  return next;
}
