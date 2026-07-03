import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { TaskStatus } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
import { useClientListView } from "@/hooks/use-client-list-view";
import { matchesListSearch } from "@/lib/list-view";
import { TaskExternalLinks } from "@/components/tasks/task-external-links";
import { InlineTaskAdd } from "@/components/tasks/inline-task-add";
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog";
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

const ALL_CLIENTS = "__all__";
const ALL_PROJECTS = "__all__";

function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.IN_PROGRESS:
      return "In progress";
    case TaskStatus.DONE:
      return "Done";
    default:
      return "To do";
  }
}

export function TasksPage() {
  const qc = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.listClients(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });

  const selectedClientId = clientFilter === ALL_CLIENTS ? undefined : clientFilter;

  const filteredProjects = useMemo(() => {
    if (!selectedClientId) return projects;
    return projects.filter((p) => p.clientId === selectedClientId);
  }, [projects, selectedClientId]);

  const selectedProjectId = projectFilter === ALL_PROJECTS ? undefined : projectFilter;

  const { data: tasks = [], isLoading, isError, error } = useQuery({
    queryKey: ["tasks", clientFilter, projectFilter],
    queryFn: () =>
      api.listTasks({
        projectId: selectedProjectId,
        clientId: selectedProjectId ? undefined : selectedClientId,
      }),
  });

  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const taskSearchMatcher = useCallback(
    (task: (typeof tasks)[number], query: string) =>
      matchesListSearch(
        query,
        task.title,
        task.project?.name ?? projectNameById[task.projectId],
        task.externalId,
        task.externalUrl,
        taskStatusLabel(task.status),
        task.note,
      ),
    [projectNameById],
  );

  const listView = useClientListView(tasks, taskSearchMatcher);

  useEffect(() => {
    if (projectFilter === ALL_PROJECTS) return;
    if (!filteredProjects.some((p) => p.id === projectFilter)) {
      setProjectFilter(ALL_PROJECTS);
    }
  }, [filteredProjects, projectFilter]);

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  function openCreate() {
    setEditTaskId(null);
    setDialogOpen(true);
  }

  function openEdit(id: string) {
    setEditTaskId(id);
    setDialogOpen(true);
  }

  async function handleDeleteTask(task: { id: string; title: string }) {
    const ok = await confirm({
      title: "Delete task",
      description: `Delete task "${task.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteTask.mutate(task.id, {
      onError: (err) => {
        void alert({
          title: "Delete failed",
          description: getErrorMessage(err),
          variant: "error",
        });
      },
    });
  }

  const defaultProjectId =
    selectedProjectId ?? filteredProjects[0]?.id ?? projects[0]?.id;

  const addProjectName =
    (selectedProjectId
      ? filteredProjects.find((p) => p.id === selectedProjectId)?.name
      : filteredProjects[0]?.name) ?? "";

  const canCreate = filteredProjects.length > 0;

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage tasks across projects. Link them to time entries on the day view.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0" disabled={!canCreate}>
          <Plus className="h-4 w-4" />
          New task
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select
            value={clientFilter}
            onValueChange={(v) => {
              setClientFilter(v);
              setProjectFilter(ALL_PROJECTS);
            }}
          >
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
          <Label>Project</Label>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
              {filteredProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ListSearchField
          value={listView.search}
          onChange={listView.setSearch}
          placeholder="Task, project, external…"
        />
      </div>

      {isError && (
        <p className="text-sm text-destructive">{getErrorMessage(error, "Cannot load tasks")}</p>
      )}

      <div className="w-full rounded-md bg-card shadow-sm overflow-hidden">
        <InlineTaskAdd
          defaultProjectId={defaultProjectId}
          projectId={selectedProjectId}
          projectName={addProjectName}
          projects={filteredProjects.map((p) => ({ id: p.id, name: p.name }))}
          showProjectSelect={!selectedProjectId}
          disabled={!canCreate}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground">
                <th className="text-left font-medium px-4 py-3">Task</th>
                <th className="text-left font-medium px-4 py-3">Project</th>
                <th className="text-left font-medium px-4 py-3">External</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Entries</th>
                <th className="text-right font-medium px-4 py-3 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && listView.filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {tasks.length === 0
                      ? "No tasks yet"
                      : listView.search.trim()
                        ? "No tasks match your search"
                        : "No tasks match the current filters"}
                  </td>
                </tr>
              )}
              {!isLoading &&
                listView.displayItems.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.project?.name ?? projectNameById[t.projectId] ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {t.externalId || t.externalUrl ? (
                      <TaskExternalLinks task={t} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {taskStatusLabel(t.status)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {t._count?.timeEntries ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(t.id)}
                        aria-label={`Edit ${t.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDeleteTask(t)}
                        disabled={deleteTask.isPending}
                        aria-label={`Delete ${t.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && listView.total > 0 && (
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

      <TaskDetailsDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTaskId(null);
        }}
        taskId={editTaskId}
        defaultProjectId={defaultProjectId}
        clientId={selectedClientId}
      />
    </div>
  );
}
