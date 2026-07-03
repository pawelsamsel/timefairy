import type { TimeEntryWithRelations, TaskWithRelations } from "@timefairy/shared-types";
import { entryLocalDateKey } from "@/lib/month-calendar";
import { isMomentEntry } from "@/lib/time-entry-kind";

export function findLatestStartMoment(
  entries: TimeEntryWithRelations[],
  taskId: string,
  date: string,
): TimeEntryWithRelations | undefined {
  return entries
    .filter(
      (entry) =>
        entry.taskId === taskId &&
        isMomentEntry(entry) &&
        entryLocalDateKey(entry) === date,
    )
    .sort((a, b) => new Date(b.startAt!).getTime() - new Date(a.startAt!).getTime())[0];
}

export function hasLoggedBlockFromMoment(
  entries: TimeEntryWithRelations[],
  taskId: string,
  momentStartAt: string,
): boolean {
  return entries.some(
    (entry) =>
      entry.taskId === taskId &&
      !isMomentEntry(entry) &&
      entry.startAt === momentStartAt &&
      !!entry.endAt,
  );
}

export function findActiveTaskStartMoment(
  entries: TimeEntryWithRelations[],
  taskId: string,
  date: string,
): TimeEntryWithRelations | undefined {
  const latestStart = findLatestStartMoment(entries, taskId, date);
  if (!latestStart?.startAt) return undefined;
  if (hasLoggedBlockFromMoment(entries, taskId, latestStart.startAt)) return undefined;
  return latestStart;
}

export function findAllActiveTaskMoments(
  entries: TimeEntryWithRelations[],
  date: string,
): TimeEntryWithRelations[] {
  const seenTaskIds = new Set<string>();
  const activeMoments: TimeEntryWithRelations[] = [];

  for (const entry of entries) {
    if (!entry.taskId || seenTaskIds.has(entry.taskId)) continue;
    const active = findActiveTaskStartMoment(entries, entry.taskId, date);
    if (!active) continue;
    seenTaskIds.add(entry.taskId);
    activeMoments.push(active);
  }

  return activeMoments;
}

export function taskForQuickLog(
  entry: TimeEntryWithRelations,
): Pick<TaskWithRelations, "id" | "projectId"> | null {
  if (!entry.taskId || !entry.projectId) return null;
  return { id: entry.taskId, projectId: entry.projectId };
}
