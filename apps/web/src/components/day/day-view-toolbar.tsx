import type { ReactNode } from "react";
import { Eye, Filter } from "lucide-react";
import type { Client } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import {
  countDayViewFilterSelections,
  dayViewFiltersActive,
  EMPTY_DAY_VIEW_FILTERS,
  toggleFilterId,
  type DayViewFilters,
} from "@/lib/day-view-preferences";
import { dayViewDisplayCustomized, type DayViewDisplayOptions } from "@/lib/entry-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DayViewToolbarProps = {
  display: DayViewDisplayOptions;
  onDisplayChange: (display: DayViewDisplayOptions) => void;
  filters: DayViewFilters;
  onFiltersChange: (filters: DayViewFilters) => void;
  lanes: Awaited<ReturnType<typeof api.listLanes>>;
  projects: Awaited<ReturnType<typeof api.listProjects>>;
  clients: Client[];
};

export function DayViewToolbar({
  display,
  onDisplayChange,
  filters,
  onFiltersChange,
  lanes,
  projects,
  clients,
}: DayViewToolbarProps) {
  const filtersActive = dayViewFiltersActive(filters);
  const filterCount = countDayViewFilterSelections(filters);
  const displayCustomized = dayViewDisplayCustomized(display);

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={displayCustomized ? "default" : "outline"}
            size="icon"
            className="relative"
            aria-label="Display options"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="end">
          <p className="mb-3 text-sm font-medium">Display</p>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={display.showTime}
                onCheckedChange={(checked) =>
                  onDisplayChange({ ...display, showTime: checked === true })
                }
              />
              <Label className="cursor-pointer font-normal">Show time</Label>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={display.showProject}
                onCheckedChange={(checked) =>
                  onDisplayChange({ ...display, showProject: checked === true })
                }
              />
              <Label className="cursor-pointer font-normal">Show project</Label>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={display.showClient}
                onCheckedChange={(checked) =>
                  onDisplayChange({ ...display, showClient: checked === true })
                }
              />
              <Label className="cursor-pointer font-normal">Show client</Label>
            </label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Time — title / task — project — client
          </p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={filtersActive ? "default" : "outline"}
            size="icon"
            className="relative"
            aria-label="Filter entries"
          >
            <Filter className="h-4 w-4" />
            {filtersActive && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] font-semibold text-primary">
                {filterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="end">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-medium">Filters</p>
            {filtersActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onFiltersChange(EMPTY_DAY_VIEW_FILTERS)}
              >
                Clear all
              </Button>
            )}
          </div>
          <div className="max-h-[min(28rem,60vh)] overflow-y-auto p-4 space-y-5">
            <FilterSection
              title="Lanes"
              emptyLabel="No lanes configured"
              items={lanes.map((lane) => ({
                id: lane.id,
                label: lane.name,
                hint: (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: lane.color }}
                  />
                ),
              }))}
              selectedIds={filters.laneIds}
              onToggle={(id) =>
                onFiltersChange({ ...filters, laneIds: toggleFilterId(filters.laneIds, id) })
              }
            />
            <FilterSection
              title="Projects"
              emptyLabel="No projects"
              items={projects.map((project) => ({
                id: project.id,
                label: project.name,
                hint: (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                ),
              }))}
              selectedIds={filters.projectIds}
              onToggle={(id) =>
                onFiltersChange({ ...filters, projectIds: toggleFilterId(filters.projectIds, id) })
              }
            />
            <FilterSection
              title="Clients"
              emptyLabel="No clients"
              items={clients.map((client) => ({
                id: client.id,
                label: client.name,
              }))}
              selectedIds={filters.clientIds}
              onToggle={(id) =>
                onFiltersChange({ ...filters, clientIds: toggleFilterId(filters.clientIds, id) })
              }
            />
          </div>
          {!filtersActive && (
            <p className="border-t px-4 py-2 text-xs text-muted-foreground">
              Select items to narrow entries. Empty selection shows all.
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FilterSection({
  title,
  emptyLabel,
  items,
  selectedIds,
  onToggle,
}: {
  title: string;
  emptyLabel: string;
  items: { id: string; label: string; hint?: ReactNode }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {selectedIds.length}
          </Badge>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50",
                  checked && "bg-muted/40",
                )}
              >
                <Checkbox checked={checked} onCheckedChange={() => onToggle(item.id)} />
                {item.hint}
                <span className="min-w-0 truncate">{item.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
