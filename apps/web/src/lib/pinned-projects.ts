const STORAGE_KEY = "timefairy-pinned-project-ids";

export const PINNED_PROJECTS_STORAGE_KEY = STORAGE_KEY;

const listeners = new Set<() => void>();

export function subscribePinnedProjectIds(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyPinnedProjectIdsChanged(): void {
  listeners.forEach((listener) => listener());
}

export function loadPinnedProjectIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function savePinnedProjectIds(ids: string[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    notifyPinnedProjectIdsChanged();
    return true;
  } catch {
    return false;
  }
}

export function togglePinnedProjectId(projectId: string, current: readonly string[]): string[] {
  const index = current.indexOf(projectId);
  if (index >= 0) return current.filter((id) => id !== projectId);
  return [projectId, ...current];
}

export function prunePinnedProjectIds(
  pinnedIds: readonly string[],
  projects: readonly { id: string }[],
): string[] {
  const validIds = new Set(projects.map((project) => project.id));
  return pinnedIds.filter((id) => validIds.has(id));
}

export function sortProjectsWithPinnedFirst<T extends { id: string; name: string }>(
  projects: readonly T[],
  pinnedIds: readonly string[],
): T[] {
  if (pinnedIds.length === 0) {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }

  const pinnedSet = new Set(pinnedIds);
  const byId = new Map(projects.map((project) => [project.id, project]));
  const pinned = pinnedIds
    .map((id) => byId.get(id))
    .filter((project): project is T => project != null);
  const unpinned = projects
    .filter((project) => !pinnedSet.has(project.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...pinned, ...unpinned];
}
