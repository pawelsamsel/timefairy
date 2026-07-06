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

type TriState = "inherit" | "yes" | "no";

function triStateToValue(state: TriState): boolean | null {
  if (state === "inherit") return null;
  return state === "yes";
}

function valueToTriState(value: boolean | null | undefined): TriState {
  if (value == null) return "inherit";
  return value ? "yes" : "no";
}

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
  const [dailyWorkHours, setDailyWorkHours] = useState("");
  const [includeSaturdays, setIncludeSaturdays] = useState<TriState>("inherit");
  const [includeSundays, setIncludeSundays] = useState<TriState>("inherit");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      setName(existing.name);
      setNote(existing.note ?? "");
      setDailyWorkHours(existing.dailyWorkHours != null ? String(existing.dailyWorkHours) : "");
      setIncludeSaturdays(valueToTriState(existing.includeSaturdays));
      setIncludeSundays(valueToTriState(existing.includeSundays));
      setDefaultHourlyRate(
        existing.defaultHourlyRate != null ? String(existing.defaultHourlyRate) : "",
      );
      setDefaultCurrency(existing.defaultCurrency ?? "");
    } else if (!isEdit) {
      setName("");
      setNote("");
      setDailyWorkHours("");
      setIncludeSaturdays("inherit");
      setIncludeSundays("inherit");
      setDefaultHourlyRate("");
      setDefaultCurrency("");
    }
    setError("");
  }, [open, isEdit, existing]);

  const save = useMutation({
    mutationFn: async () => {
      const parsedHours = dailyWorkHours.trim()
        ? parseFloat(dailyWorkHours.replace(",", "."))
        : null;
      if (dailyWorkHours.trim() && (!Number.isFinite(parsedHours) || parsedHours! <= 0)) {
        throw new Error("Daily work hours must be greater than zero.");
      }

      const parsedRate = defaultHourlyRate.trim()
        ? parseFloat(defaultHourlyRate.replace(",", "."))
        : null;
      if (defaultHourlyRate.trim() && (!Number.isFinite(parsedRate) || parsedRate! < 0)) {
        throw new Error("Default hourly rate must be zero or greater.");
      }

      const payload = {
        name: name.trim(),
        note: note.trim() || undefined,
        dailyWorkHours: dailyWorkHours.trim() ? parsedHours : null,
        includeSaturdays: triStateToValue(includeSaturdays),
        includeSundays: triStateToValue(includeSundays),
        defaultHourlyRate: defaultHourlyRate.trim() ? parsedRate : null,
        defaultCurrency: defaultCurrency.trim().toUpperCase() || null,
      };

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
            {isEdit
              ? "Update client details and optional contract defaults."
              : "Add a client for billing and projects."}
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

          <div className="space-y-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Work hours override</p>
              <p className="text-xs text-muted-foreground">
                Leave empty to use global defaults from Settings → Work hours.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-daily-hours">Daily work hours</Label>
              <Input
                id="client-daily-hours"
                type="number"
                min={0.25}
                step={0.5}
                value={dailyWorkHours}
                onChange={(e) => setDailyWorkHours(e.target.value)}
                placeholder="Use global default"
              />
            </div>
            <div className="space-y-2">
              <Label>Saturdays</Label>
              <div className="flex flex-wrap gap-2">
                {(["inherit", "yes", "no"] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={includeSaturdays === option ? "default" : "outline"}
                    onClick={() => setIncludeSaturdays(option)}
                  >
                    {option === "inherit" ? "Global" : option === "yes" ? "Include" : "Exclude"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sundays</Label>
              <div className="flex flex-wrap gap-2">
                {(["inherit", "yes", "no"] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={includeSundays === option ? "default" : "outline"}
                    onClick={() => setIncludeSundays(option)}
                  >
                    {option === "inherit" ? "Global" : option === "yes" ? "Include" : "Exclude"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Billing defaults</p>
              <p className="text-xs text-muted-foreground">
                Optional defaults for new projects on this client.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-hourly-rate">Default hourly rate</Label>
                <Input
                  id="client-hourly-rate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={defaultHourlyRate}
                  onChange={(e) => setDefaultHourlyRate(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-currency">Currency</Label>
                <Input
                  id="client-currency"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  maxLength={3}
                  placeholder="PLN"
                />
              </div>
            </div>
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
