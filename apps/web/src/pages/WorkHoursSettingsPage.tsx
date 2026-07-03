import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_WORK_HOURS_PREFERENCES, TrackTimeMode, type WorkHoursPreferences } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
import { fallbackWorkHoursPreferences } from "@/lib/work-hours";
import { useWorkHoursPreferences } from "@/lib/use-work-hours-preferences";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WorkHoursSettingsPage() {
  const qc = useQueryClient();
  const { alert } = useAppDialog();
  const prefsQuery = useWorkHoursPreferences();

  const [dailyWorkHours, setDailyWorkHours] = useState(String(DEFAULT_WORK_HOURS_PREFERENCES.dailyWorkHours));
  const [includeSaturdays, setIncludeSaturdays] = useState(DEFAULT_WORK_HOURS_PREFERENCES.includeSaturdays);
  const [includeSundays, setIncludeSundays] = useState(DEFAULT_WORK_HOURS_PREFERENCES.includeSundays);
  const [onlyBillableProjects, setOnlyBillableProjects] = useState(
    DEFAULT_WORK_HOURS_PREFERENCES.onlyBillableProjects,
  );
  const [trackTimeMode, setTrackTimeMode] = useState<WorkHoursPreferences["trackTimeMode"]>(
    DEFAULT_WORK_HOURS_PREFERENCES.trackTimeMode,
  );
  const [minimalTaskMinutes, setMinimalTaskMinutes] = useState(
    String(DEFAULT_WORK_HOURS_PREFERENCES.minimalTaskMinutes),
  );
  const [useTimeGrid, setUseTimeGrid] = useState(DEFAULT_WORK_HOURS_PREFERENCES.useTimeGrid);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!prefsQuery.data) return;
    setDailyWorkHours(String(prefsQuery.data.dailyWorkHours));
    setIncludeSaturdays(prefsQuery.data.includeSaturdays);
    setIncludeSundays(prefsQuery.data.includeSundays);
    setOnlyBillableProjects(prefsQuery.data.onlyBillableProjects);
    setTrackTimeMode(prefsQuery.data.trackTimeMode);
    setMinimalTaskMinutes(String(prefsQuery.data.minimalTaskMinutes));
    setUseTimeGrid(prefsQuery.data.useTimeGrid);
  }, [prefsQuery.data]);

  const save = useMutation({
    mutationFn: () => {
      const parsedHours = parseFloat(dailyWorkHours.replace(",", "."));
      if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
        throw new Error("Daily work hours must be greater than zero.");
      }
      const parsedMinimal = parseInt(minimalTaskMinutes, 10);
      if (!Number.isFinite(parsedMinimal) || parsedMinimal < 1) {
        throw new Error("Minimal task time must be at least 1 minute.");
      }
      return api.updateWorkHoursPreferences({
        dailyWorkHours: parsedHours,
        includeSaturdays,
        includeSundays,
        onlyBillableProjects,
        trackTimeMode,
        minimalTaskMinutes: parsedMinimal,
        useTimeGrid,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-hours-preferences"] });
      setError("");
      void alert({
        title: "Work hours saved",
        description: "Calendar and day views will use these defaults.",
        variant: "success",
      });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    save.mutate();
  }

  const effective = fallbackWorkHoursPreferences(prefsQuery.data);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Work hours</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Global defaults for calendars and daily targets. Clients can override these individually.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Track time</CardTitle>
          <CardDescription>
            Controls play / stop behavior on tasks in Day view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              {
                value: TrackTimeMode.SINGLE,
                label: "Single task",
                description: "Only one task can be active. Starting another stops the previous one.",
              },
              {
                value: TrackTimeMode.MULTI,
                label: "Multi task",
                description: "Allow multiple tasks to be tracked at the same time.",
              },
              {
                value: TrackTimeMode.ASK,
                label: "Ask",
                description: "Ask before stopping the current task when starting another.",
              },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/30"
            >
              <input
                type="radio"
                name="track-time-mode"
                value={option.value}
                checked={trackTimeMode === option.value}
                onChange={() => setTrackTimeMode(option.value)}
                disabled={prefsQuery.isLoading}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>
            Used when no client-specific override applies. Billable means projects with hourly rate
            above zero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="minimal-task-minutes">Minimal task time (minutes)</Label>
              <Input
                id="minimal-task-minutes"
                type="number"
                min={1}
                max={240}
                step={1}
                value={minimalTaskMinutes}
                onChange={(e) => setMinimalTaskMinutes(e.target.value)}
                className="w-32"
                disabled={prefsQuery.isLoading}
              />
              <p className="text-xs text-muted-foreground">
                When you stop before this duration, you can skip logging or log the minimum time.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={useTimeGrid}
                onCheckedChange={(checked) => setUseTimeGrid(checked === true)}
                disabled={prefsQuery.isLoading}
              />
              Use time grid
            </label>
            <p className="text-xs text-muted-foreground -mt-3 ml-6">
              Snap timeline to {minimalTaskMinutes || "15"}-minute blocks (e.g. 00–15, 15–30, 30–45).
            </p>

            <div className="space-y-2">
              <Label htmlFor="daily-work-hours">Daily work hours</Label>
              <Input
                id="daily-work-hours"
                type="number"
                min={0.25}
                step={0.5}
                value={dailyWorkHours}
                onChange={(e) => setDailyWorkHours(e.target.value)}
                className="w-32"
                disabled={prefsQuery.isLoading}
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeSaturdays}
                  onCheckedChange={(checked) => setIncludeSaturdays(checked === true)}
                  disabled={prefsQuery.isLoading}
                />
                Include Saturdays
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeSundays}
                  onCheckedChange={(checked) => setIncludeSundays(checked === true)}
                  disabled={prefsQuery.isLoading}
                />
                Include Sundays
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={onlyBillableProjects}
                  onCheckedChange={(checked) => setOnlyBillableProjects(checked === true)}
                  disabled={prefsQuery.isLoading}
                />
                Only billable projects
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={save.isPending || prefsQuery.isLoading}>
              {save.isPending ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per client</CardTitle>
          <CardDescription>
            Edit a client to override daily hours or weekend rules for that contract. When you filter
            Day view or mini calendar by a single client, those overrides apply automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Current effective defaults: {effective.dailyWorkHours}h/day
          {effective.includeSaturdays ? ", Saturdays included" : ""}
          {effective.includeSundays ? ", Sundays included" : ""}
          {effective.onlyBillableProjects ? ", billable only" : ""}
          {effective.useTimeGrid ? `, ${effective.minimalTaskMinutes} min grid` : ""}.
        </CardContent>
      </Card>
    </div>
  );
}
