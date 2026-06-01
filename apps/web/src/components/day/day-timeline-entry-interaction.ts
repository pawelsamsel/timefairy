import { useCallback, useRef, useState } from "react";
import type { TimeEntryWithRelations } from "@timefairy/shared-types";
import {
  clampEntryMinuteRange,
  entryToMinuteRange,
  minuteRangeToIsoRange,
  type MinuteRange,
} from "@/lib/timeline";

export type EntrySchedulePreview = {
  entryId: string;
  range: MinuteRange;
};

export type EntryScheduleChange = {
  entryId: string;
  startAt: string;
  endAt: string;
};

type DragMode = "move" | "resize-start" | "resize-end";

type DragSession = {
  entryId: string;
  mode: DragMode;
  anchorMinute: number;
  initialRange: MinuteRange;
};

export function useEntryScheduleDrag({
  dateStr,
  minuteFromClientY,
  onScheduleChange,
}: {
  dateStr: string;
  minuteFromClientY: (clientY: number) => number | null;
  onScheduleChange: (change: EntryScheduleChange) => void;
}) {
  const sessionRef = useRef<DragSession | null>(null);
  const previewRangeRef = useRef<MinuteRange | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [preview, setPreview] = useState<EntrySchedulePreview | null>(null);

  const applyPreview = useCallback((entryId: string, range: MinuteRange) => {
    previewRangeRef.current = range;
    setPreview({ entryId, range });
  }, []);

  const endDrag = useCallback(() => {
    const session = sessionRef.current;
    const range = previewRangeRef.current;
    sessionRef.current = null;
    previewRangeRef.current = null;
    setPreview(null);

    if (session && range) {
      const initial = session.initialRange;
      if (range.start !== initial.start || range.end !== initial.end) {
        suppressClickRef.current = true;
        const iso = minuteRangeToIsoRange(dateStr, range);
        onScheduleChange({
          entryId: session.entryId,
          startAt: iso.startAt,
          endAt: iso.endAt,
        });
      }
    }

    movedRef.current = false;
  }, [dateStr, onScheduleChange]);

  const updatePreview = useCallback(
    (session: DragSession, minute: number) => {
      const { initialRange, anchorMinute, mode } = session;
      let next: MinuteRange;

      if (mode === "move") {
        const delta = minute - anchorMinute;
        next = { start: initialRange.start + delta, end: initialRange.end + delta };
      } else if (mode === "resize-start") {
        next = { start: minute, end: initialRange.end };
      } else {
        next = { start: initialRange.start, end: minute };
      }

      const clamped = clampEntryMinuteRange(next);
      if (!clamped) return;
      applyPreview(session.entryId, clamped);
    },
    [applyPreview],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) return;

      const minute = minuteFromClientY(e.clientY);
      if (minute === null) return;

      if (Math.abs(minute - session.anchorMinute) >= 1) {
        movedRef.current = true;
      }

      updatePreview(session, minute);
    },
    [minuteFromClientY, updatePreview],
  );

  const onPointerUp = useCallback(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    endDrag();
  }, [endDrag, onPointerMove]);

  const startDrag = useCallback(
    (e: React.PointerEvent, entry: TimeEntryWithRelations, mode: DragMode) => {
      if (!entry.startAt) return;

      const initialRange = entryToMinuteRange(entry.startAt, entry.endAt, entry.durationMinutes);
      if (!initialRange) return;

      const anchorMinute = minuteFromClientY(e.clientY);
      if (anchorMinute === null) return;

      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      sessionRef.current = {
        entryId: entry.id,
        mode,
        anchorMinute,
        initialRange,
      };
      movedRef.current = false;
      applyPreview(entry.id, initialRange);

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [applyPreview, minuteFromClientY, onPointerMove, onPointerUp],
  );

  const entryClickAllowed = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return false;
    }
    return !movedRef.current;
  }, []);

  return { preview, startDrag, entryClickAllowed };
}
