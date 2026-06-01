import { useEffect, useState } from "react";
import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import {
  DEFAULT_DAY_VIEW_DISPLAY,
  type DayViewDisplayOptions,
  resolveEntryClientId,
} from "./entry-display";

export type DayViewFilters = {
  laneIds: string[];
  projectIds: string[];
  clientIds: string[];
};

export const EMPTY_DAY_VIEW_FILTERS: DayViewFilters = {
  laneIds: [],
  projectIds: [],
  clientIds: [],
};

function loadSessionJson<T>(storageKey: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function useSessionJson<T extends object>(storageKey: string, fallback: T) {
  const [value, setValue] = useState<T>(() => loadSessionJson(storageKey, fallback));

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // ignore write failures
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}

const DAY_VIEW_DISPLAY_KEY = "timefairy-day-view-display";
const DAY_VIEW_FILTERS_KEY = "timefairy-day-view-filters";

export function useDayViewDisplay() {
  return useSessionJson<DayViewDisplayOptions>(DAY_VIEW_DISPLAY_KEY, DEFAULT_DAY_VIEW_DISPLAY);
}

export function useDayViewFilters() {
  return useSessionJson<DayViewFilters>(DAY_VIEW_FILTERS_KEY, EMPTY_DAY_VIEW_FILTERS);
}

export function dayViewFiltersActive(filters: DayViewFilters): boolean {
  return filters.laneIds.length > 0 || filters.projectIds.length > 0 || filters.clientIds.length > 0;
}

export function countDayViewFilterSelections(filters: DayViewFilters): number {
  return filters.laneIds.length + filters.projectIds.length + filters.clientIds.length;
}

export function sanitizeDayViewFilters(
  filters: DayViewFilters,
  lanes: { id: string }[],
  projects: { id: string }[],
  clients: { id: string }[],
): DayViewFilters {
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const projectIds = new Set(projects.map((project) => project.id));
  const clientIds = new Set(clients.map((client) => client.id));

  return {
    laneIds: filters.laneIds.filter((id) => laneIds.has(id)),
    projectIds: filters.projectIds.filter((id) => projectIds.has(id)),
    clientIds: filters.clientIds.filter((id) => clientIds.has(id)),
  };
}

export function dayViewFiltersEqual(a: DayViewFilters, b: DayViewFilters): boolean {
  return (
    a.laneIds.length === b.laneIds.length &&
    a.projectIds.length === b.projectIds.length &&
    a.clientIds.length === b.clientIds.length &&
    a.laneIds.every((id, index) => id === b.laneIds[index]) &&
    a.projectIds.every((id, index) => id === b.projectIds[index]) &&
    a.clientIds.every((id, index) => id === b.clientIds[index])
  );
}

export function filterDayViewEntries(
  entries: TimeEntryWithRelations[],
  filters: DayViewFilters,
  projectClientIds: Map<string, string>,
): TimeEntryWithRelations[] {
  if (!dayViewFiltersActive(filters)) return entries;

  return entries.filter((entry) => {
    if (filters.laneIds.length > 0 && !filters.laneIds.includes(entry.laneId)) {
      return false;
    }
    if (filters.projectIds.length > 0) {
      if (!entry.projectId || !filters.projectIds.includes(entry.projectId)) {
        return false;
      }
    }
    if (filters.clientIds.length > 0) {
      const clientId = resolveEntryClientId(entry, projectClientIds);
      if (!clientId || !filters.clientIds.includes(clientId)) {
        return false;
      }
    }
    return true;
  });
}

export function toggleFilterId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
