import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  TimeEntryCreateDialog,
  type TimeEntryCreateInitial,
} from "@/components/time-entry/time-entry-create-dialog";
import { useIsMobileLayout } from "@/hooks/use-media-query";
import { buildMobileNowLogFormDefaults } from "@/lib/mobile-day-timeline";
import { useMobileShell } from "@/lib/mobile-shell-context";
import {
  loadTimelineZoomLevel,
  resolveTimelineViewConfig,
  type TimelineViewConfig,
} from "@/lib/timeline-zoom";
import { fallbackWorkHoursPreferences } from "@/lib/work-hours";
import { useWorkHoursPreferences } from "@/lib/use-work-hours-preferences";
import { toDateInputValue } from "@/lib/datetime";

export function MobileAddLogHost() {
  const isMobile = useIsMobileLayout();
  const { registerOpenAddLog } = useMobileShell();
  const workHoursQuery = useWorkHoursPreferences();
  const workHoursPreferences = fallbackWorkHoursPreferences(workHoursQuery.data);
  const timelineViewConfig = useMemo(
    () => resolveTimelineViewConfig(workHoursPreferences, loadTimelineZoomLevel()),
    [workHoursPreferences],
  );
  const timelineViewConfigRef = useRef<TimelineViewConfig>(timelineViewConfig);
  timelineViewConfigRef.current = timelineViewConfig;

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [initialValues, setInitialValues] = useState<TimeEntryCreateInitial>({});

  const openAddLog = useCallback(() => {
    const { dateStr, startAt, endAt } = buildMobileNowLogFormDefaults(timelineViewConfigRef.current);
    setSelectedDate(dateStr);
    setInitialValues({
      kind: "block",
      startAt,
      useEndTime: true,
      endAt,
    });
    setOpen(true);
  }, []);

  useLayoutEffect(() => {
    if (!isMobile) {
      registerOpenAddLog(null);
      return;
    }

    registerOpenAddLog(openAddLog);
    return () => registerOpenAddLog(null);
  }, [isMobile, openAddLog, registerOpenAddLog]);

  if (!isMobile) return null;

  return (
    <TimeEntryCreateDialog
      open={open}
      onOpenChange={setOpen}
      selectedDate={selectedDate}
      initialValues={initialValues}
    />
  );
}
