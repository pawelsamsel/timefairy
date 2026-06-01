import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  clientId?: string | null;
};

export function ClientFormDialog({ open, onOpenChange, clientId }: Props) {
  const qc = useQueryClient();
  const isEdit = clientId != null;

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.listClients(),
    enabled: open && isEdit,
  });

  const existing = clients.find((c) => c.id === clientId);

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      setName(existing.name);
      setNote(existing.note ?? "");
    } else if (!isEdit) {
      setName("");
      setNote("");
    }
    setError("");
  }, [open, isEdit, existing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), note: note.trim() || undefined };
      if (isEdit) return api.updateClient(clientId!, payload);
      return api.createClient(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
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
          <DialogTitle>{isEdit ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update client name or note." : "Add a client for billing and projects."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="client-name">Name</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-note">Note</Label>
            <Textarea
              id="client-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional"
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
