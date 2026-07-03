import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings() });

  const update = useMutation({
    mutationFn: (registrationEnabled: boolean) => api.updateSettings({ registrationEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">System settings</h1>
      <div className="card max-w-lg space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings?.registrationEnabled ?? false}
            onChange={(e) => update.mutate(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Allow public registration</span>
        </label>
      </div>
    </div>
  );
}
