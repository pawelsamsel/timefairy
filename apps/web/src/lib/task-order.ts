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

export function previewTaskOrder(
  tasks: TaskWithRelations[],
  draggedId: string,
  insertIndex: number | null,
): TaskWithRelations[] {
  if (insertIndex === null) return tasks;
  const nextIds = moveTaskToIndex(
    tasks.map((task) => task.id),
    draggedId,
    insertIndex,
  );
  if (!nextIds) return tasks;
  const byId = new Map(tasks.map((task) => [task.id, task]));
  return nextIds.map((id) => byId.get(id)!);
}

export function resolveTaskInsertIndex(
  clientY: number,
  tasks: TaskWithRelations[],
  draggedId: string,
  getRowElement: (taskId: string) => HTMLElement | null | undefined,
): number {
  const positioned = tasks
    .filter((task) => task.id !== draggedId)
    .map((task) => {
      const el = getRowElement(task.id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { task, rect };
    })
    .filter((entry): entry is { task: TaskWithRelations; rect: DOMRect } => entry !== null)
    .sort((a, b) => a.rect.top - b.rect.top);

  for (const { task, rect } of positioned) {
    if (clientY < rect.top + rect.height / 2) {
      return tasks.findIndex((entry) => entry.id === task.id);
    }
  }

  return tasks.length;
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
