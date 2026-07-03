import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
import { useClientListView } from "@/hooks/use-client-list-view";
import { matchesListSearch } from "@/lib/list-view";
import { formatDateTime } from "@/lib/format";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ListPagination } from "@/components/list/list-pagination";
import { ListSearchField } from "@/components/list/list-search-field";
import { Button } from "@/components/ui/button";

export function ClientsPage() {
  const qc = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const { data: clients = [], isLoading, isError, error } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.listClients(),
  });

  const clientSearchMatcher = useCallback(
    (client: (typeof clients)[number], query: string) =>
      matchesListSearch(query, client.name, client.note),
    [],
  );

  const listView = useClientListView(clients, clientSearchMatcher);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);

  const deleteClient = useMutation({
    mutationFn: (id: string) => api.deleteClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  function openCreate() {
    setEditClientId(null);
    setDialogOpen(true);
  }

  function openEdit(id: string) {
    setEditClientId(id);
    setDialogOpen(true);
  }

  async function handleDeleteClient(client: { id: string; name: string }) {
    const ok = await confirm({
      title: "Delete client",
      description: `Delete client "${client.name}"? Related projects and tasks will also be removed.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteClient.mutate(client.id, {
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
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clients used for projects and billing.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" />
          New client
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <ListSearchField
          value={listView.search}
          onChange={listView.setSearch}
          placeholder="Name or note…"
        />
      </div>

      {isError && (
        <p className="text-sm text-destructive">{getErrorMessage(error, "Cannot load clients")}</p>
      )}

      <div className="w-full rounded-md bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground">
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Note</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
                <th className="text-right font-medium px-4 py-3 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && listView.filteredItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {clients.length === 0
                      ? "No clients yet"
                      : listView.search.trim()
                        ? "No clients match your search"
                        : "No clients yet"}
                  </td>
                </tr>
              )}
              {!isLoading &&
                listView.displayItems.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.note ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(c.id)}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDeleteClient(c)}
                          disabled={deleteClient.isPending}
                          aria-label={`Delete ${c.name}`}
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

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditClientId(null);
        }}
        clientId={editClientId}
      />
    </div>
  );
}
