import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadPinnedProjectIds,
  PINNED_PROJECTS_STORAGE_KEY,
  savePinnedProjectIds,
  sortProjectsWithPinnedFirst,
  subscribePinnedProjectIds,
  togglePinnedProjectId,
} from "@/lib/pinned-projects";

function pinnedIdsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function usePinnedProjects() {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => loadPinnedProjectIds());
  const pinnedIdSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  useEffect(() => {
    return subscribePinnedProjectIds(() => {
      setPinnedIds((current) => {
        const loaded = loadPinnedProjectIds();
        return pinnedIdsEqual(current, loaded) ? current : loaded;
      });
    });
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PINNED_PROJECTS_STORAGE_KEY) return;
      setPinnedIds((current) => {
        const loaded = loadPinnedProjectIds();
        return pinnedIdsEqual(current, loaded) ? current : loaded;
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const togglePin = useCallback((projectId: string) => {
    setPinnedIds((current) => {
      const next = togglePinnedProjectId(projectId, current);
      if (!savePinnedProjectIds(next)) return current;
      return next;
    });
  }, []);

  const sortProjects = useCallback(
    <T extends { id: string; name: string }>(projects: readonly T[]) =>
      sortProjectsWithPinnedFirst(projects, pinnedIds),
    [pinnedIds],
  );

  const isPinned = useCallback((projectId: string) => pinnedIdSet.has(projectId), [pinnedIdSet]);

  return { pinnedIds, pinnedIdSet, togglePin, sortProjects, isPinned };
}
