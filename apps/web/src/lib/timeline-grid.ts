import type { WorkHoursPreferences } from "@timefairy/shared-types";
import { DEFAULT_WORK_HOURS_PREFERENCES } from "@timefairy/shared-types";

export type TimelineGridConfig = {
  gridStepMinutes: number;
  minEntryMinutes: number;
  useTimeGrid: boolean;
};

export function resolveTimelineGridConfig(
  prefs: Pick<WorkHoursPreferences, "minimalTaskMinutes" | "useTimeGrid">,
): TimelineGridConfig {
  const minEntryMinutes = prefs.minimalTaskMinutes ?? DEFAULT_WORK_HOURS_PREFERENCES.minimalTaskMinutes;
  return {
    minEntryMinutes,
    useTimeGrid: prefs.useTimeGrid,
    gridStepMinutes: prefs.useTimeGrid ? minEntryMinutes : 15,
  };
}

export function floorTimelineMinutes(minutes: number, gridStepMinutes: number): number {
  if (gridStepMinutes <= 1) return minutes;
  return Math.floor(minutes / gridStepMinutes) * gridStepMinutes;
}

export function ceilTimelineMinutes(minutes: number, gridStepMinutes: number): number {
  if (gridStepMinutes <= 1) return minutes;
  return Math.ceil(minutes / gridStepMinutes) * gridStepMinutes;
}

export function snapTimelineMinutesToGrid(minutes: number, gridStepMinutes: number): number {
  if (gridStepMinutes <= 1) return minutes;
  return Math.round(minutes / gridStepMinutes) * gridStepMinutes;
}

export function computeLoggedBlockRange(
  startAtIso: string,
  endAtIso: string,
  config: TimelineGridConfig,
  options: { enforceMinimum?: boolean } = {},
): { startMinutes: number; endMinutes: number } {
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);

  let startMinutes = start.getHours() * 60 + start.getMinutes();
  let endMinutes = end.getHours() * 60 + end.getMinutes();

  if (config.useTimeGrid) {
    startMinutes = floorTimelineMinutes(startMinutes, config.gridStepMinutes);
    endMinutes = ceilTimelineMinutes(endMinutes, config.gridStepMinutes);
  }

  if (endMinutes <= startMinutes) {
    endMinutes = startMinutes + config.minEntryMinutes;
  }

  let duration = endMinutes - startMinutes;
  if (options.enforceMinimum && duration < config.minEntryMinutes) {
    endMinutes = startMinutes + config.minEntryMinutes;
    duration = config.minEntryMinutes;
  }

  if (config.useTimeGrid && duration % config.gridStepMinutes !== 0) {
    endMinutes = startMinutes + Math.max(
      config.minEntryMinutes,
      Math.ceil(duration / config.gridStepMinutes) * config.gridStepMinutes,
    );
  }

  return { startMinutes, endMinutes };
}

export function computeLoggedBlockIsoRange(
  dateStr: string,
  startAtIso: string,
  endAtIso: string,
  config: TimelineGridConfig,
  options: { enforceMinimum?: boolean } = {},
): { startAt: string; endAt: string } {
  const { startMinutes, endMinutes } = computeLoggedBlockRange(startAtIso, endAtIso, config, options);
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  start.setMinutes(startMinutes);
  const end = new Date(y, m - 1, d, 0, 0, 0, 0);
  end.setMinutes(endMinutes);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function elapsedMinutesFromStart(startAtIso: string, endAtIso = new Date().toISOString()): number {
  const start = new Date(startAtIso).getTime();
  const end = new Date(endAtIso).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}
