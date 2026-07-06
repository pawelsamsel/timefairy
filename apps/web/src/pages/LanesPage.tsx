import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
import { LaneFormDialog, isMainLane } from "@/components/lanes/lane-form-dialog";
import { Button } from "@/components/ui/button";

export function LanesPage() {
  const qc = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const { data: lanes = [], isLoading, isError, error } = useQuery({
    queryKey: ["lanes"],
    queryFn: () => api.listLanes(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLaneId, setEditLaneId] = useState<string | null>(null);

  const deleteLane = useMutation({
    mutationFn: (id: string) => api.deleteLane(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lanes"] }),
  });

  function openCreate() {
    setEditLaneId(null);
    setDialogOpen(true);
  }

  function openEdit(id: string) {
    setEditLaneId(id);
    setDialogOpen(true);
  }

  async function handleDeleteLane(lane: { id: string; name: string }) {
    const ok = await confirm({
      title: "Delete lane",
      description: `Delete lane "${lane.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteLane.mutate(lane.id, {
      onError: (err) => {
        void alert({
          title: "Delete failed",
          description: getErrorMessage(err),
          variant: "error",
        });
      },
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="hidden text-xl font-semibold tracking-tight md:block">Lanes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each account has its own lanes (Główny, Międzyczas, …). Główny cannot be removed.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" />
          New lane
        </Button>
      </div>

      {isError && (
        <p className="text-sm text-destructive">{getErrorMessage(error, "Cannot load lanes")}</p>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left font-medium px-4 py-3 w-12" />
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-right font-medium px-4 py-3 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && lanes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No lanes found
                  </td>
                </tr>
              )}
              {lanes.map((lane) => (
                <tr
                  key={lane.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: lane.color }}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {lane.name}
                    {isMainLane(lane) && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">required</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lane.type}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(lane.id)}
                        aria-label={`Edit ${lane.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!isMainLane(lane) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDeleteLane(lane)}
                          disabled={deleteLane.isPending}
                          aria-label={`Delete ${lane.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LaneFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditLaneId(null);
        }}
        laneId={editLaneId}
      />
    </div>
  );
}
