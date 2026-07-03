import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DEFAULT_DELAY_MS = 2000;

type DelayedTooltipProps = {
  label: string;
  delayMs?: number;
  children: ReactNode;
  className?: string;
};

export function DelayedTooltip({
  label,
  delayMs = DEFAULT_DELAY_MS,
  children,
  className,
}: DelayedTooltipProps) {
  const timerRef = useRef<number | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  const showAtAnchor = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    });
    setVisible(true);
  }, []);

  const scheduleShow = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(showAtAnchor, delayMs);
  }, [clearTimer, delayMs, showAtAnchor]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <>
      <span
        ref={anchorRef}
        className={cn("inline-flex", className)}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onFocus={scheduleShow}
        onBlur={hide}
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[100] -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
            style={{ left: pos.x, top: pos.y }}
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}
