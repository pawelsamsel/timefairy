import type { TimeEntryWithRelations } from "@timefairy/shared-types";

export type DayViewDisplayOptions = {
  showTime: boolean;
  showProject: boolean;
  showClient: boolean;
};

export const DEFAULT_DAY_VIEW_DISPLAY: DayViewDisplayOptions = {
  showTime: true,
  showProject: true,
  showClient: false,
};

export function dayViewDisplayCustomized(display: DayViewDisplayOptions): boolean {
  return (
    display.showTime !== DEFAULT_DAY_VIEW_DISPLAY.showTime ||
    display.showProject !== DEFAULT_DAY_VIEW_DISPLAY.showProject ||
    display.showClient !== DEFAULT_DAY_VIEW_DISPLAY.showClient
  );
}

export function resolveEntryClientId(
  entry: TimeEntryWithRelations,
  projectClientIds: Map<string, string>,
): string | null {
  if (entry.clientId) return entry.clientId;
  if (entry.client?.id) return entry.client.id;
  if (entry.projectId) return projectClientIds.get(entry.projectId) ?? null;
  return null;
}

export function resolveEntryClientName(
  entry: TimeEntryWithRelations,
  clientNames: Map<string, string>,
  projectClientIds: Map<string, string>,
): string | null {
  if (entry.client?.name) return entry.client.name;
  const clientId = resolveEntryClientId(entry, projectClientIds);
  if (clientId) return clientNames.get(clientId) ?? null;
  return null;
}

export function formatTaskReference(task: {
  title: string;
  externalId?: string | null;
}): string {
  const title = task.title.trim();
  if (task.externalId && title) return `${task.externalId} · ${title}`;
  return title;
}

export function entryDisplayTitle(entry: TimeEntryWithRelations): string {
  const title = entry.title?.trim();
  if (title) return title;

  const legacyNote = entry.note?.trim();
  if (legacyNote) return legacyNote;

  const taskTitle = entry.task?.title?.trim();
  if (taskTitle) {
    return entry.task?.externalId
      ? formatTaskReference({ title: taskTitle, externalId: entry.task.externalId })
      : taskTitle;
  }

  if (entry.project?.name) return entry.project.name;
  return "Untitled entry";
}

export function entryHasSupplementaryNote(entry: TimeEntryWithRelations): boolean {
  const note = entry.note?.trim();
  if (!note) return false;
  if (entry.title?.trim()) return true;
  if (entry.taskId || entry.task?.title) return true;
  return false;
}

export function formatEntryLabel(
  entry: TimeEntryWithRelations,
  display: DayViewDisplayOptions,
  clientNames: Map<string, string>,
  projectClientIds: Map<string, string>,
  timePrefix?: string | null,
): string {
  let label = entryDisplayTitle(entry);
  if (display.showProject) {
    label += ` - ${entry.project?.name ?? "No project"}`;
  }
  if (display.showClient) {
    label += ` - ${resolveEntryClientName(entry, clientNames, projectClientIds) ?? "No client"}`;
  }
  if (timePrefix && display.showTime) label = `${timePrefix} ${label}`;
  return label;
}

export function formatEntryTooltipLines(
  entry: TimeEntryWithRelations,
  clientNames: Map<string, string>,
  projectClientIds: Map<string, string>,
  timePrefix?: string | null,
): string[] {
  const lines: string[] = [];
  if (timePrefix) lines.push(timePrefix);
  lines.push(entryDisplayTitle(entry));
  if (entry.project?.name) lines.push(entry.project.name);
  const clientName = resolveEntryClientName(entry, clientNames, projectClientIds);
  if (clientName) lines.push(clientName);
  const note = entry.note?.trim();
  if (note && entryHasSupplementaryNote(entry)) lines.push(note);
  return lines;
}
