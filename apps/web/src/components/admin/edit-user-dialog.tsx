import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Role, type User } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
};

export function EditUserDialog({ userId, onOpenChange }: Props) {
  const open = userId != null;
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => api.getUser(userId!),
    enabled: open,
  });

  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(Role.USER);
  const [timezone, setTimezone] = useState("UTC");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmHardDelete, setConfirmHardDelete] = useState(false);

  const isSelf = userId === currentUser?.id;

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setRole(user.role);
    setTimezone(user.timezone);
    setActive(user.active);
    setPassword("");
    setError("");
    setConfirmHardDelete(false);
  }, [user]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    if (userId) qc.invalidateQueries({ queryKey: ["admin-user", userId] });
  };

  const update = useMutation({
    mutationFn: () => api.updateUser(userId!, { name, role, timezone, active }),
    onSuccess: () => {
      invalidate();
      setError("");
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const changePassword = useMutation({
    mutationFn: () => api.changeUserPassword(userId!, { password }),
    onSuccess: () => {
      invalidate();
      setPassword("");
      setError("");
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const softDelete = useMutation({
    mutationFn: () => api.softDeleteUser(userId!),
    onSuccess: (u) => {
      invalidate();
      applyUser(u);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const restore = useMutation({
    mutationFn: () => api.restoreUser(userId!),
    onSuccess: (u) => {
      invalidate();
      applyUser(u);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const hardDelete = useMutation({
    mutationFn: () => api.hardDeleteUser(userId!),
    onSuccess: () => {
      invalidate();
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function applyUser(u: User) {
    setName(u.name);
    setRole(u.role);
    setTimezone(u.timezone);
    setActive(u.active);
  }

  function onProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    update.mutate();
  }

  function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    changePassword.mutate();
  }

  const busy =
    update.isPending ||
    changePassword.isPending ||
    softDelete.isPending ||
    restore.isPending ||
    hardDelete.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            {user ? (
              <>
                {user.email}
                {!user.active && (
                  <Badge variant="destructive" className="ml-2">
                    Inactive
                  </Badge>
                )}
              </>
            ) : (
              "Loading…"
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Loading user…</p>}

        {user && (
          <div className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <form onSubmit={onProfileSubmit} className="space-y-4">
              <h3 className="text-sm font-medium">Profile</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Role.USER}>User</SelectItem>
                      <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-timezone">Timezone</Label>
                  <Input
                    id="edit-timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-active"
                  checked={active}
                  onCheckedChange={(v) => setActive(v === true)}
                  disabled={isSelf}
                />
                <Label htmlFor="edit-active" className="font-normal cursor-pointer">
                  Account active
                </Label>
              </div>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  You cannot deactivate your own account here.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Created {formatDateTime(user.createdAt)} · Updated{" "}
                {formatDateTime(user.updatedAt)}
              </p>
              <Button type="submit" disabled={busy}>
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>

            <form onSubmit={onPasswordSubmit} className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-medium">Password</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-password">New password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                />
              </div>
              <Button type="submit" variant="secondary" disabled={busy || !password}>
                {changePassword.isPending ? "Updating…" : "Set password"}
              </Button>
            </form>

            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-destructive">Danger zone</h3>
              {user.active ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || isSelf}
                    onClick={() => softDelete.mutate()}
                  >
                    {softDelete.isPending ? "Deactivating…" : "Soft delete (deactivate)"}
                  </Button>
                  {isSelf && (
                    <span className="text-xs text-muted-foreground self-center">
                      Cannot deactivate yourself
                    </span>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => restore.mutate()}
                >
                  {restore.isPending ? "Restoring…" : "Restore account"}
                </Button>
              )}
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Hard delete permanently removes the user and all their data (clients, projects,
                  time entries, lanes). This cannot be undone.
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="confirm-hard"
                    checked={confirmHardDelete}
                    onCheckedChange={(v) => setConfirmHardDelete(v === true)}
                    disabled={isSelf}
                  />
                  <Label htmlFor="confirm-hard" className="font-normal text-xs cursor-pointer">
                    I understand, delete permanently
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy || !confirmHardDelete || isSelf}
                  onClick={() => hardDelete.mutate()}
                >
                  {hardDelete.isPending ? "Deleting…" : "Hard delete user"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="dialogOutline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
