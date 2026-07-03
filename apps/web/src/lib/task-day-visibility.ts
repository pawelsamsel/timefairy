export type TaskScheduleFields = {
  pinned: boolean;
  scheduledFrom: string | null;
  scheduledTo: string | null;
};

export type TaskScopeFilter = "today" | "week" | "incoming" | "all";

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

export function weekBoundsForDate(dateStr: string): { from: string; to: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(y, m - 1, d + mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return { from: fmt(monday), to: fmt(sunday) };
}

function addDaysLocal(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + delta);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

export function isTaskIncoming(
  task: TaskScheduleFields,
  selectedDate: string,
  today: string,
): boolean {
  if (isTaskVisibleOnDay(task, selectedDate, today)) return false;

  const to = taskDateOnly(task.scheduledTo);
  let day = addDaysLocal(selectedDate, 1);
  const limit = addDaysLocal(selectedDate, 366);

  while (day <= limit) {
    if (to && day > to && !task.pinned) break;
    if (isTaskVisibleOnDay(task, day, today)) return true;
    if (!to && !taskDateOnly(task.scheduledFrom) && !task.pinned) break;
    day = addDaysLocal(day, 1);
  }

  return false;
}

export function isTaskVisibleInScope(
  task: TaskScheduleFields,
  scope: TaskScopeFilter,
  selectedDate: string,
  today: string,
): boolean {
  switch (scope) {
    case "today":
      return isTaskVisibleOnDay(task, selectedDate, today);
    case "week": {
      const { from, to } = weekBoundsForDate(selectedDate);
      let day = from;
      while (day <= to) {
        if (isTaskVisibleOnDay(task, day, today)) return true;
        day = addDaysLocal(day, 1);
      }
      return false;
    }
    case "incoming":
      return isTaskIncoming(task, selectedDate, today);
    case "all":
      return true;
  }
}

export function formatTaskScheduleLabel(task: TaskScheduleFields): string | null {
  const from = taskDateOnly(task.scheduledFrom);
  const to = taskDateOnly(task.scheduledTo);
  if (!from && !to) return null;
  if (from && to) return `${from} → ${to}`;
  if (from) return `from ${from}`;
  return `due ${to}`;
}
