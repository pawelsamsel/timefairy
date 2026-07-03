import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { api } from "@/lib/api";
import {
  dateRangeBounds,
  defaultReportFromDate,
  toDateInputValue,
} from "@/lib/datetime";
import {
  buildReportCsv,
  buildReportMarkdown,
  buildReportRows,
  downloadTextFile,
  reportFilenameBase,
  type ReportFilters,
} from "@/lib/report-export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_CLIENTS = "__all__";

export function ReportsPage() {
  const [fromDate, setFromDate] = useState(defaultReportFromDate);
  const [toDate, setToDate] = useState(toDateInputValue(new Date()));
  const [clientId, setClientId] = useState(ALL_CLIENTS);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.listClients(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });

  const rangeInvalid = fromDate > toDate;
  const apiRange = rangeInvalid ? null : dateRangeBounds(fromDate, toDate);
  const selectedClientId = clientId === ALL_CLIENTS ? undefined : clientId;
  const selectedClientName =
    clientId === ALL_CLIENTS ? null : (clients.find((c) => c.id === clientId)?.name ?? null);

  const queryParams = useMemo(
    () =>
      apiRange
        ? {
            from: apiRange.from,
            to: apiRange.to,
            clientId: selectedClientId,
          }
        : null,
    [apiRange, selectedClientId],
  );

  const { data: summary = [], isLoading: summaryLoading } = useQuery({
    queryKey: ["time-summary", queryParams],
    queryFn: () => api.timeEntrySummary(queryParams!),
    enabled: queryParams != null,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["time-entries", "report", queryParams],
    queryFn: () => api.listTimeEntries(queryParams!),
    enabled: queryParams != null,
  });

  const projectClientIds = useMemo(
    () => new Map(projects.map((p) => [p.id, p.clientId])),
    [projects],
  );

  const clientNames = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const reportRows = useMemo(
    () => buildReportRows(entries, projectClientIds, clientNames),
    [entries, projectClientIds, clientNames],
  );

  const filters: ReportFilters = {
    fromDate,
    toDate,
    clientId: selectedClientId ?? null,
    clientName: selectedClientName,
  };

  const totalHours = summary.reduce((sum, row) => sum + row.totalMinutes, 0) / 60;
  const loading = summaryLoading || entriesLoading;
  const baseName = reportFilenameBase(filters);

  function exportMarkdown() {
    const md = buildReportMarkdown(filters, summary, reportRows);
    downloadTextFile(`${baseName}.md`, md, "text/markdown");
  }

  function exportCsv() {
    const csv = buildReportCsv(filters, summary, reportRows);
    downloadTextFile(`${baseName}.csv`, csv, "text/csv");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter by period and client, then export summary and entries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Entries are matched by start time, or creation date when untimed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="report-from">From</Label>
              <Input
                id="report-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="native-picker-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-to">To</Label>
              <Input
                id="report-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="native-picker-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLIENTS}>All clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {rangeInvalid && (
            <p className="text-sm text-destructive">End date must be on or after start date.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={rangeInvalid || loading || (summary.length === 0 && entries.length === 0)}
              onClick={exportMarkdown}
            >
              <FileText className="h-4 w-4" />
              Download Markdown
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={rangeInvalid || loading || (summary.length === 0 && entries.length === 0)}
              onClick={exportCsv}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>
              {loading
                ? "Loading…"
                : `${summary.length} project groups · ${totalHours.toFixed(2)} h total`}
            </CardDescription>
          </div>
          <Download className="h-4 w-4 text-muted-foreground" aria-hidden />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Project</th>
                <th className="py-2 font-medium text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={`${row.clientId ?? "x"}-${row.projectId ?? "x"}`} className="border-b border-border/50">
                  <td className="py-2 pr-4">{row.clientName ?? "—"}</td>
                  <td className="py-2 pr-4">{row.projectName ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums">{(row.totalMinutes / 60).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {summary.length > 0 && (
              <tfoot>
                <tr className="font-medium">
                  <td className="py-2 pr-4" colSpan={2}>
                    Total
                  </td>
                  <td className="py-2 text-right tabular-nums">{totalHours.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {!loading && summary.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No data for the selected filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
