import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useWorkHoursPreferences() {
  return useQuery({
    queryKey: ["work-hours-preferences"],
    queryFn: () => api.getWorkHoursPreferences(),
  });
}
