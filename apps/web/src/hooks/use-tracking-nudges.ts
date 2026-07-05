import { useEffect, useRef } from "react";
import type { TimeEntryWithRelations, WorkHoursPreferences } from "@timefairy/shared-types";
import {
  loadTrackingNudgePreferences,
  type TrackingNudgePreferences,
} from "@/lib/tracking-nudge-preferences";
import { playCheckInNudgeSound, playIdleNudgeSound } from "@/lib/tracking-nudge-sounds";
import { isWithinTypicalWorkHours, latestEntryActivityAt } from "@/lib/tracking-time";
import { elapsedMinutesFromStart } from "@/lib/timeline-grid";

type UseTrackingNudgesOptions = {
  enabled: boolean;
  selectedDate: string;
  today: string;
  workHoursPreferences: WorkHoursPreferences;
  activeMoments: TimeEntryWithRelations[];
  dayEntries: TimeEntryWithRelations[];
  onIdleNudge: () => void;
  onCheckInNudge: (moment: TimeEntryWithRelations) => Promise<boolean>;
};

const POLL_MS = 30_000;

export function useTrackingNudges({
  enabled,
  selectedDate,
  today,
  workHoursPreferences,
  activeMoments,
  dayEntries,
  onIdleNudge,
  onCheckInNudge,
}: UseTrackingNudgesOptions): void {
  const prefsRef = useRef<TrackingNudgePreferences>(loadTrackingNudgePreferences());
  const idleNotifiedRef = useRef(false);
  const checkInNotifiedRef = useRef<Map<string, number>>(new Map());
  const idleSinceRef = useRef<number | null>(null);
  const checkInBusyRef = useRef(false);
  const onIdleNudgeRef = useRef(onIdleNudge);
  const onCheckInNudgeRef = useRef(onCheckInNudge);

  onIdleNudgeRef.current = onIdleNudge;
  onCheckInNudgeRef.current = onCheckInNudge;

  useEffect(() => {
    if (!enabled || selectedDate !== today) return;

    const prefs = loadTrackingNudgePreferences();
    prefsRef.current = prefs;
    if (!prefs.enabled) return;

    function tick() {
      if (document.hidden) return;

      const now = new Date();
      if (!isWithinTypicalWorkHours(now, workHoursPreferences)) {
        idleSinceRef.current = null;
        idleNotifiedRef.current = false;
        return;
      }

      const currentPrefs = loadTrackingNudgePreferences();
      prefsRef.current = currentPrefs;
      if (!currentPrefs.enabled) return;

      if (activeMoments.length === 0) {
        if (idleSinceRef.current == null) {
          const lastActivity = latestEntryActivityAt(dayEntries, today);
          idleSinceRef.current = lastActivity?.getTime() ?? now.getTime();
        }

        const idleMinutes = (now.getTime() - idleSinceRef.current) / 60_000;
        if (idleMinutes >= currentPrefs.idleMinutes && !idleNotifiedRef.current) {
          idleNotifiedRef.current = true;
          if (currentPrefs.soundsEnabled) playIdleNudgeSound();
          onIdleNudgeRef.current();
        }
        return;
      }

      idleSinceRef.current = null;
      idleNotifiedRef.current = false;

      if (checkInBusyRef.current) return;

      for (const moment of activeMoments) {
        if (!moment.startAt) continue;
        const elapsedMinutes = elapsedMinutesFromStart(moment.startAt);
        if (elapsedMinutes < currentPrefs.checkInMinutes) continue;

        const bucket = Math.floor(elapsedMinutes / currentPrefs.checkInMinutes);
        const lastBucket = checkInNotifiedRef.current.get(moment.id);
        if (lastBucket === bucket) continue;

        checkInNotifiedRef.current.set(moment.id, bucket);
        checkInBusyRef.current = true;

        if (currentPrefs.soundsEnabled) playCheckInNudgeSound();

        void onCheckInNudgeRef.current(moment).finally(() => {
          checkInBusyRef.current = false;
        });
        break;
      }
    }

    tick();
    const intervalId = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [activeMoments, dayEntries, enabled, selectedDate, today, workHoursPreferences]);
}
