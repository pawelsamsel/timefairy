export const TASK_DRAG_MIME = "application/x-timefairy-task";

export type TaskDragPayload = {
  taskId: string;
  projectId: string;
  title: string;
};

export function parseTaskDragPayload(data: DataTransfer): TaskDragPayload | null {
  const raw = data.getData(TASK_DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TaskDragPayload;
  } catch {
    return null;
  }
}

export function isTaskDragEvent(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(TASK_DRAG_MIME);
}
