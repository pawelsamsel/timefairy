export type TrackingNudgePreferences = {
  enabled: boolean;
  soundsEnabled: boolean;
  idleMinutes: number;
  checkInMinutes: number;
};

const STORAGE_KEY = "timefairy-tracking-nudges";

export const DEFAULT_TRACKING_NUDGE_PREFERENCES: TrackingNudgePreferences = {
  enabled: true,
  soundsEnabled: true,
  idleMinutes: 15,
  checkInMinutes: 60,
};

export function loadTrackingNudgePreferences(): TrackingNudgePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TRACKING_NUDGE_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<TrackingNudgePreferences>;
    return {
      ...DEFAULT_TRACKING_NUDGE_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_TRACKING_NUDGE_PREFERENCES;
  }
}

export function saveTrackingNudgePreferences(prefs: TrackingNudgePreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
