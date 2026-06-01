import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LaneType, type Lane } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laneId?: string | null;
};

export function LaneFormDialog({ open, onOpenChange, laneId }: Props) {
  const qc = useQueryClient();
  const isEdit = laneId != null;

  const { data: lanes = [] } = useQuery({
    queryKey: ["lanes"],
    queryFn: () => api.listLanes(),
    enabled: open,
  });

  const lane = lanes.find((l) => l.id === laneId);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#00509d");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (isEdit && lane) {
      setName(lane.name);
      setColor(lane.color);
    } else if (!isEdit) {
      setName("");
      setColor("#00509d");
    }
    setError("");
  }, [open, isEdit, lane]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), color };
      if (isEdit) return api.updateLane(laneId!, payload);
      return api.createLane({
        name: payload.name,
        color: payload.color,
        type: LaneType.CUSTOM,
        sortOrder: lanes.length,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lanes"] });
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lane" : "New lane"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Change display name or color." : "Add a custom lane for your timeline."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="lane-name">Name</Label>
            <Input
              id="lane-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deep work"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lane-color">Color</Label>
            <Input
              id="lane-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 p-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="dialogOutline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !name.trim()}>
              {save.isPending ? "Saving…" : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function isMainLane(lane: Lane): boolean {
  return lane.type === LaneType.LOGGED;
}
