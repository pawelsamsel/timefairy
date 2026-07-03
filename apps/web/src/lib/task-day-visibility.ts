export type TaskScheduleFields = {
  pinned: boolean;
  scheduledFrom: string | null;
  scheduledTo: string | null;
};

export function taskDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

export function isTaskVisibleOnDay(
  task: TaskScheduleFields,
  day: string,
  today: string,
): boolean {
  if (task.pinned) return true;

  const from = taskDateOnly(task.scheduledFrom);
  const to = taskDateOnly(task.scheduledTo);

  if (!from && !to) return true;

  if (from && day < from) return false;

  if (to && day > to) {
    if (day === today && today > to) return true;
    return false;
  }

  return true;
}

export function formatTaskScheduleLabel(task: TaskScheduleFields): string | null {
  const from = taskDateOnly(task.scheduledFrom);
  const to = taskDateOnly(task.scheduledTo);
  if (!from && !to) return null;
  if (from && to) return `${from} → ${to}`;
  if (from) return `from ${from}`;
  return `due ${to}`;
}
