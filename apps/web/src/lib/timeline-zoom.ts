import type { WorkHoursPreferences } from "@timefairy/shared-types";
import { resolveTimelineGridConfig, type TimelineGridConfig } from "@/lib/timeline-grid";

export type TimelineZoomLevel = 0 | 1 | 2;

export type TimelineZoomPreset = {
  level: TimelineZoomLevel;
  label: string;
  description: string;
  hourHeightPx: number;
  gridStepMinutes: number;
};

export const TIMELINE_ZOOM_STORAGE_KEY = "timefairy-timeline-zoom";

export const TIMELINE_ZOOM_PRESETS: TimelineZoomPreset[] = [
  {
    level: 0,
    label: "Compact",
    description: "30 min grid, full day fits the view",
    hourHeightPx: 40,
    gridStepMinutes: 30,
  },
  {
    level: 1,
    label: "Normal",
    description: "15 min grid",
    hourHeightPx: 64,
    gridStepMinutes: 15,
  },
  {
    level: 2,
    label: "Detailed",
    description: "5 min grid, taller hours",
    hourHeightPx: 96,
    gridStepMinutes: 5,
  },
];

export type TimelineViewConfig = TimelineGridConfig & {
  hourHeightPx: number;
  zoomLevel: TimelineZoomLevel;
};

export function loadTimelineZoomLevel(): TimelineZoomLevel {
  const stored = localStorage.getItem(TIMELINE_ZOOM_STORAGE_KEY);
  if (stored === "0" || stored === "1" || stored === "2") {
    return Number(stored) as TimelineZoomLevel;
  }
  return 1;
}

export function saveTimelineZoomLevel(level: TimelineZoomLevel) {
  localStorage.setItem(TIMELINE_ZOOM_STORAGE_KEY, String(level));
}

export function getTimelineZoomPreset(level: TimelineZoomLevel): TimelineZoomPreset {
  return TIMELINE_ZOOM_PRESETS[level] ?? TIMELINE_ZOOM_PRESETS[1];
}

export function resolveCompactHourHeightPx(
  availableHeightPx: number,
  hourCount: number,
  paddingBottomPx = 14,
  minHourHeightPx = 32,
): number {
  const usable = Math.max(0, availableHeightPx - paddingBottomPx);
  return Math.max(minHourHeightPx, Math.floor(usable / hourCount));
}

export function resolveTimelineViewConfig(
  prefs: Pick<WorkHoursPreferences, "minimalTaskMinutes" | "useTimeGrid">,
  zoomLevel: TimelineZoomLevel,
): TimelineViewConfig {
  const preset = getTimelineZoomPreset(zoomLevel);
  const base = resolveTimelineGridConfig(prefs);
  const gridStepMinutes = base.useTimeGrid
    ? Math.max(base.minEntryMinutes, preset.gridStepMinutes)
    : preset.gridStepMinutes;

  return {
    ...base,
    gridStepMinutes,
    hourHeightPx: preset.hourHeightPx,
    zoomLevel,
  };
}
