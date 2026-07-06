import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
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

export function ProfileSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { alert } = useAppDialog();
  const prefsQuery = useWorkHoursPreferences();

  const [onlyBillableHours, setOnlyBillableHours] = useState(false);
  const [preferenceError, setPreferenceError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!prefsQuery.data) return;
    setOnlyBillableHours(prefsQuery.data.onlyBillableProjects);
  }, [prefsQuery.data]);

  const saveOnlyBillableHours = useMutation({
    mutationFn: (value: boolean) => api.updateWorkHoursPreferences({ onlyBillableProjects: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-hours-preferences"] });
      setPreferenceError("");
    },
    onError: (err) => {
      setPreferenceError(getErrorMessage(err));
      if (prefsQuery.data) setOnlyBillableHours(prefsQuery.data.onlyBillableProjects);
    },
  });

  const changePassword = useMutation({
    mutationFn: () => api.changeOwnPassword({ currentPassword, password }),
    onSuccess: () => {
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirm("");
      setPasswordError("");
      void alert({
        title: "Password updated",
        description: "Your password has been changed.",
        variant: "success",
      });
    },
    onError: (err) => {
      setPasswordError(getErrorMessage(err));
    },
  });

  function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (password !== passwordConfirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    changePassword.mutate();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="hidden text-xl font-semibold tracking-tight md:block">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Your account details and password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in as {user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                id="only-billable-hours"
                checked={onlyBillableHours}
                onCheckedChange={(checked) => {
                  const value = checked === true;
                  setOnlyBillableHours(value);
                  setPreferenceError("");
                  saveOnlyBillableHours.mutate(value);
                }}
                disabled={prefsQuery.isLoading || saveOnlyBillableHours.isPending}
                className="mt-0.5"
              />
              <span>
                <Label htmlFor="only-billable-hours" className="cursor-pointer font-medium">
                  Count only billable hours
                </Label>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Keep all entries visible, but totals and calendar hours include billable projects
                  only.
                </span>
              </span>
            </label>
            {preferenceError && <p className="text-sm text-destructive">{preferenceError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update the password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onPasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
