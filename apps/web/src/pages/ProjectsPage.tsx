import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
import { useClientListView } from "@/hooks/use-client-list-view";
import { matchesListSearch } from "@/lib/list-view";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ListPagination } from "@/components/list/list-pagination";
import { ListSearchField } from "@/components/list/list-search-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL_CLIENTS = "__all__";
const VIEW_FLAT = "flat";
const VIEW_GROUPED = "grouped";

type ProjectRow = Project & {
  client?: { id: string; name: string } | null;
  _count?: { tasks: number; timeEntries: number };
};

function ProjectTableRow({
  project,
  hideClient,
  onEdit,
  onDelete,
  deletePending,
}: {
  project: ProjectRow;
  hideClient?: boolean;
  onEdit: (id: string) => void;
  onDelete: (project: { id: string; name: string }) => void;
  deletePending: boolean;
}) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 font-medium">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.color ?? "#00509d" }}
          />
          {project.name}
        </div>
      </td>
      {!hideClient && (
        <td className="px-4 py-3 text-muted-foreground">{project.client?.name ?? "—"}</td>
      )}
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {project.hourlyRate} {project.currency}/h
      </td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {project._count?.tasks ?? 0}
      </td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {project._count?.timeEntries ?? 0}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(project.id)}
            aria-label={`Edit ${project.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => void onDelete(project)}
            disabled={deletePending}
            aria-label={`Delete ${project.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function ProjectsPage() {
  const qc = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [viewMode, setViewMode] = useState(VIEW_FLAT);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.listClients(),
  });

  const { data: projects = [], isLoading, isError, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });

  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  const selectedClientId = clientFilter === ALL_CLIENTS ? undefined : clientFilter;

  const visibleProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name));
    if (!selectedClientId) return sorted;
    return sorted.filter((p) => p.clientId === selectedClientId);
  }, [projects, selectedClientId]);

  const projectSearchMatcher = useCallback(
    (project: ProjectRow, query: string) => {
      const clientName =
        project.client?.name ??
        clients.find((c) => c.id === project.clientId)?.name ??
        "";
      return matchesListSearch(
        query,
        project.name,
        clientName,
        project.currency,
        String(project.hourlyRate),
        project.note,
      );
    },
    [clients],
  );

  const isGrouped = viewMode === VIEW_GROUPED;

  const listView = useClientListView(visibleProjects, projectSearchMatcher, {
    paginate: !isGrouped,
  });

  const groupedProjects = useMemo(() => {
    const groups = new Map<string, { clientId: string; clientName: string; projects: ProjectRow[] }>();

    for (const project of listView.filteredItems) {
      const clientId = project.clientId;
      const clientName =
        project.client?.name ??
        clients.find((c) => c.id === clientId)?.name ??
        "Unknown client";

      const existing = groups.get(clientId);
      if (existing) {
        existing.projects.push(project);
      } else {
        groups.set(clientId, { clientId, clientName, projects: [project] });
      }
    }

    return [...groups.values()].sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [listView.filteredItems, clients]);

  useEffect(() => {
    if (isGrouped && listView.search.trim()) {
      setCollapsedGroups(new Set());
    }
  }, [isGrouped, listView.search]);

  const deleteProject = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", "tasks"] }),
  });

  function openCreate() {
    setEditProjectId(null);
    setProjectDialogOpen(true);
  }

  function openEdit(id: string) {
    setEditProjectId(id);
    setProjectDialogOpen(true);
  }

  async function handleDeleteProject(project: { id: string; name: string }) {
    const ok = await confirm({
      title: "Delete project",
      description: `Delete project "${project.name}" and all its tasks? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteProject.mutate(project.id, {
      onError: (err) => {
        void alert({
          title: "Delete failed",
          description: getErrorMessage(err),
          variant: "error",
        });
      },
    });
  }

  function toggleGroup(clientId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function expandAllGroups() {
    setCollapsedGroups(new Set());
  }

  function collapseAllGroups() {
    setCollapsedGroups(new Set(groupedProjects.map((g) => g.clientId)));
  }

  const colSpan = isGrouped ? 5 : 6;
  const hasClientFilter = selectedClientId != null;
  const emptyMessage =
    projects.length === 0
      ? "No projects yet"
      : listView.search.trim()
        ? "No projects match your search"
        : hasClientFilter
          ? "No projects match this client filter"
          : "No projects yet";

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage projects, hourly rates, and client assignment.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLIENTS}>All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>View</Label>
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={VIEW_FLAT}>Flat list</SelectItem>
              <SelectItem value={VIEW_GROUPED}>Grouped by client</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isGrouped && groupedProjects.length > 0 && (
          <div className="flex items-center gap-2 pb-0.5">
            <Button type="button" variant="ghost" size="sm" onClick={expandAllGroups}>
              Expand all
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={collapseAllGroups}>
              Collapse all
            </Button>
          </div>
        )}
        <ListSearchField
          value={listView.search}
          onChange={listView.setSearch}
          placeholder="Project, client, rate…"
        />
      </div>

      {isError && (
        <p className="text-sm text-destructive">{getErrorMessage(error, "Cannot load projects")}</p>
      )}

      <div className="w-full rounded-md bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground">
                <th className="text-left font-medium px-4 py-3">Project</th>
                {!isGrouped && <th className="text-left font-medium px-4 py-3">Client</th>}
                <th className="text-left font-medium px-4 py-3">Rate</th>
                <th className="text-right font-medium px-4 py-3">Tasks</th>
                <th className="text-right font-medium px-4 py-3">Entries</th>
                <th className="text-right font-medium px-4 py-3 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && listView.filteredItems.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {!isLoading &&
                !isGrouped &&
                listView.displayItems.map((p) => (
                  <ProjectTableRow
                    key={p.id}
                    project={p}
                    onEdit={openEdit}
                    onDelete={handleDeleteProject}
                    deletePending={deleteProject.isPending}
                  />
                ))}
              {!isLoading &&
                isGrouped &&
                groupedProjects.map((group) => {
                  const collapsed = collapsedGroups.has(group.clientId);
                  return (
                    <Fragment key={group.clientId}>
                      <tr className="bg-muted/25">
                        <td colSpan={colSpan} className="p-0">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.clientId)}
                            aria-expanded={!collapsed}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-left text-foreground hover:bg-muted/40 transition-colors"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                collapsed && "-rotate-90",
                              )}
                            />
                            {group.clientName}
                            <span className="font-normal text-muted-foreground">
                              {group.projects.length}
                            </span>
                          </button>
                        </td>
                      </tr>
                      {!collapsed &&
                        group.projects.map((p) => (
                          <ProjectTableRow
                            key={p.id}
                            project={p}
                            hideClient
                            onEdit={openEdit}
                            onDelete={handleDeleteProject}
                            deletePending={deleteProject.isPending}
                          />
                        ))}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!isLoading && !isGrouped && listView.paginate && listView.total > 0 && (
          <ListPagination
            page={listView.page}
            totalPages={listView.totalPages}
            total={listView.total}
            from={listView.from}
            to={listView.to}
            pageSize={listView.pageSize}
            onPageChange={listView.setPage}
            onPageSizeChange={listView.setPageSize}
          />
        )}
      </div>

      <ProjectFormDialog
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open);
          if (!open) setEditProjectId(null);
        }}
        projectId={editProjectId}
      />
    </div>
  );
}
