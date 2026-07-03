import { useCallback, useRef, useState } from "react";
import {
  buildCreateDragRange,
  findDayFreeSegmentContainingMinute,
  isMinuteNearMomentEntries,
  type MinuteRange,
  type TimelineDropSlot,
} from "@/lib/timeline";

export const TIMELINE_CREATE_ARM_MS = 250;
export const TIMELINE_CREATE_MIN_GESTURE_MS = 250;

type PressState = {
  anchorMinute: number;
  freeSegment: TimelineDropSlot;
  pointerId: number;
  startedAt: number;
  armed: boolean;
};

export function useTimelineCreateDrag({
  minuteFromClientY,
  occupiedRanges,
  momentStartMinutes,
  gridStepMinutes,
  minEntryMinutes,
  onCreate,
}: {
  minuteFromClientY: (clientY: number) => number | null;
  occupiedRanges: MinuteRange[];
  momentStartMinutes: number[];
  gridStepMinutes: number;
  minEntryMinutes: number;
  onCreate: (slot: TimelineDropSlot) => void;
}) {
  const pressRef = useRef<PressState | null>(null);
  const sessionRef = useRef<{
    anchorMinute: number;
    freeSegment: TimelineDropSlot;
  } | null>(null);
  const previewRef = useRef<MinuteRange | null>(null);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasDraggedRef = useRef(false);
  const onPointerMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const onPointerUpRef = useRef<(e: PointerEvent) => void>(() => {});
  const [preview, setPreview] = useState<MinuteRange | null>(null);

  const clearArmTimer = useCallback(() => {
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  const removeWindowListeners = useCallback(() => {
    window.removeEventListener("pointermove", onPointerMoveRef.current);
    window.removeEventListener("pointerup", onPointerUpRef.current);
    window.removeEventListener("pointercancel", onPointerUpRef.current);
  }, []);

  const resetPress = useCallback(() => {
    clearArmTimer();
    removeWindowListeners();
    pressRef.current = null;
    sessionRef.current = null;
    previewRef.current = null;
    captureTargetRef.current = null;
    hasDraggedRef.current = false;
    setPreview(null);
  }, [clearArmTimer, removeWindowListeners]);

  const applyPreview = useCallback((range: MinuteRange) => {
    previewRef.current = range;
    setPreview(range);
  }, []);

  const updatePreview = useCallback(
    (currentMinute: number) => {
      const session = sessionRef.current;
      if (!session) return;

      if (currentMinute !== session.anchorMinute) {
        hasDraggedRef.current = true;
      }

      const range = buildCreateDragRange(
        session.anchorMinute,
        currentMinute,
        session.freeSegment,
        { gridStepMinutes, minEntryMinutes },
      );
      if (!range) return;
      applyPreview(range);
    },
    [applyPreview, gridStepMinutes, minEntryMinutes],
  );

  const finishPress = useCallback(() => {
    const press = pressRef.current;
    const range = previewRef.current;
    const shouldCreate =
      press?.armed === true &&
      hasDraggedRef.current &&
      range != null &&
      Date.now() - press.startedAt >= TIMELINE_CREATE_MIN_GESTURE_MS;

    resetPress();

    if (shouldCreate && range) {
      onCreate({
        startMinutes: range.start,
        durationMinutes: range.end - range.start,
      });
    }
  }, [onCreate, resetPress]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const press = pressRef.current;
      if (!press?.armed) return;

      e.preventDefault();
      const currentMinute = minuteFromClientY(e.clientY);
      if (currentMinute === null) return;
      updatePreview(currentMinute);
    },
    [minuteFromClientY, updatePreview],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const press = pressRef.current;
      if (!press) return;

      const captureTarget = captureTargetRef.current;
      if (captureTarget?.hasPointerCapture(e.pointerId)) {
        captureTarget.releasePointerCapture(e.pointerId);
      }

      if (press.armed) {
        const currentMinute = minuteFromClientY(e.clientY);
        if (currentMinute !== null) {
          updatePreview(currentMinute);
        }
      }

      finishPress();
    },
    [finishPress, minuteFromClientY, updatePreview],
  );

  onPointerMoveRef.current = onPointerMove;
  onPointerUpRef.current = onPointerUp;

  const startCreateDrag = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return false;

      const minute = minuteFromClientY(e.clientY);
      if (minute === null) return false;
      if (isMinuteNearMomentEntries(minute, momentStartMinutes)) return false;

      const freeSegment = findDayFreeSegmentContainingMinute(
        minute,
        occupiedRanges,
        minEntryMinutes,
      );
      if (!freeSegment) return false;

      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      captureTargetRef.current = target;

      pressRef.current = {
        anchorMinute: minute,
        freeSegment,
        pointerId: e.pointerId,
        startedAt: Date.now(),
        armed: false,
      };
      hasDraggedRef.current = false;

      clearArmTimer();
      armTimerRef.current = setTimeout(() => {
        armTimerRef.current = null;
        const press = pressRef.current;
        if (!press) return;

        press.armed = true;
        sessionRef.current = {
          anchorMinute: press.anchorMinute,
          freeSegment: press.freeSegment,
        };
        updatePreview(press.anchorMinute);
      }, TIMELINE_CREATE_ARM_MS);

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      return true;
    },
    [
      clearArmTimer,
      minEntryMinutes,
      minuteFromClientY,
      momentStartMinutes,
      occupiedRanges,
      onPointerMove,
      onPointerUp,
      updatePreview,
    ],
  );

  const cancelCreateDrag = useCallback(() => {
    if (!pressRef.current && !sessionRef.current) return;
    resetPress();
  }, [resetPress]);

  return { preview, startCreateDrag, cancelCreateDrag, isCreating: preview !== null };
}
