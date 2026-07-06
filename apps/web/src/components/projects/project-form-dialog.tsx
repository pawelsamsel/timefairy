import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DEFAULT_PROJECT_COLOR } from "@/lib/project-colors";
import { getErrorMessage } from "@/lib/errors";
import { ProjectColorPicker } from "@/components/projects/project-color-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
};

export function ProjectFormDialog({ open, onOpenChange, projectId }: Props) {
  const qc = useQueryClient();
  const isEdit = projectId != null;

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.listClients(),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
    enabled: open && isEdit,
  });

  const existing = projects.find((p) => p.id === projectId);

  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("100");
  const [currency, setCurrency] = useState("PLN");
  const [isBillable, setIsBillable] = useState(true);
  const [color, setColor] = useState<string>(DEFAULT_PROJECT_COLOR);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      setClientId(existing.clientId);
      setName(existing.name);
      setHourlyRate(String(existing.hourlyRate));
      setCurrency(existing.currency);
      setIsBillable(existing.isBillable);
      setColor(existing.color ?? DEFAULT_PROJECT_COLOR);
    } else if (!isEdit) {
      setClientId(clients[0]?.id ?? "");
      setName("");
      setHourlyRate("100");
      setCurrency("PLN");
      setIsBillable(true);
      setColor(DEFAULT_PROJECT_COLOR);
    }
    setError("");
  }, [open, isEdit, existing, clients]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        clientId,
        name,
        color,
        hourlyRate: parseFloat(hourlyRate),
        currency,
        isBillable,
      };
      if (isEdit) return api.updateProject(projectId!, payload);
      return api.createProject(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update client, billing, and name." : "Assign a client and hourly rate."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <ProjectColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="project-rate">Hourly rate</Label>
              <Input
                id="project-rate"
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                required
              />
            </div>
            <div className="w-20 space-y-2">
              <Label htmlFor="project-currency">Curr.</Label>
              <Input
                id="project-currency"
                value={currency}
                maxLength={3}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={isBillable}
              onCheckedChange={(checked) => setIsBillable(checked === true)}
            />
            <Label className="cursor-pointer font-normal">Billable</Label>
          </label>
          <DialogFooter>
            <Button type="button" variant="dialogOutline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !clientId}>
              {save.isPending ? "Saving…" : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
