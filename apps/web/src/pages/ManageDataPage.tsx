import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { userDataExportSchema, type UserDataExport, type UserDataImportResult } from "@timefairy/shared-types";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppDialog } from "@/lib/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatImportSummary(result: UserDataImportResult) {
  const created = Object.values(result.created).reduce((a, b) => a + b, 0);
  const updated = Object.values(result.updated).reduce((a, b) => a + b, 0);
  return `${created} created, ${updated} updated${result.idRemapped ? `, ${result.idRemapped} IDs remapped` : ""}`;
}

export function ManageDataPage() {
  const qc = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const fileRef = useRef<HTMLInputElement>(null);

  const [importPreview, setImportPreview] = useState<UserDataExport | null>(null);
  const [importError, setImportError] = useState("");

  const exportData = useMutation({
    mutationFn: () => api.exportUserData(),
    onSuccess: (data) => {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`timefairy-export-${stamp}.json`, data);
      void alert({
        title: "Export complete",
        description: `Backup saved as timefairy-export-${stamp}.json`,
        variant: "success",
      });
    },
    onError: (err) => {
      void alert({
        title: "Export failed",
        description: getErrorMessage(err),
        variant: "error",
      });
    },
  });

  const importData = useMutation({
    mutationFn: (payload: UserDataExport) => api.importUserData(payload),
    onSuccess: (result) => {
      setImportPreview(null);
      setImportError("");
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries();
      void alert({
        title: "Import complete",
        description: formatImportSummary(result),
        variant: "success",
      });
    },
    onError: (err) => setImportError(getErrorMessage(err)),
  });

  async function handleImport() {
    if (!importPreview) return;
    const ok = await confirm({
      title: "Import data",
      description:
        "Merge this backup into your account? Records with the same ID will be updated; new records will be added.",
      confirmLabel: "Import",
    });
    if (!ok) return;
    importData.mutate(importPreview, {
      onError: (err) => {
        void alert({
          title: "Import failed",
          description: getErrorMessage(err),
          variant: "error",
        });
      },
    });
  }

  async function onFileSelected(file: File | undefined) {
    setImportError("");
    setImportPreview(null);
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const parsed = userDataExportSchema.safeParse(json);
      if (!parsed.success) {
        setImportError("Invalid export file format.");
        return;
      }
      setImportPreview(parsed.data);
    } catch {
      setImportError("Could not read JSON file.");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Manage data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import and export a backup of your clients, projects, tasks, lanes, and time entries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export data</CardTitle>
          <CardDescription>
            Download a JSON backup of all your data (clients, projects, tasks, lanes, time entries,
            events, planned blocks).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => exportData.mutate()}
            disabled={exportData.isPending}
          >
            <Download className="h-4 w-4" />
            {exportData.isPending ? "Exporting…" : "Download backup"}
          </Button>
          {exportData.isError && (
            <p className="text-sm text-destructive mt-2">{getErrorMessage(exportData.error)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import data</CardTitle>
          <CardDescription>
            Merge a backup into your account. Records with the same ID are updated; new records are
            added. Use after moving from local to server (same or new login).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-file">Backup file (.json)</Label>
            <Input
              id="import-file"
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => onFileSelected(e.target.files?.[0])}
            />
          </div>

          {importPreview && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Exported:</span>{" "}
                {new Date(importPreview.exportedAt).toLocaleString()}
              </p>
              <p>
                <span className="text-muted-foreground">Profile:</span> {importPreview.profile.email}
              </p>
              <p className="text-muted-foreground">
                {importPreview.clients.length} clients · {importPreview.projects.length} projects ·{" "}
                {importPreview.tasks.length} tasks · {importPreview.lanes.length} lanes ·{" "}
                {importPreview.timeEntries.length} time entries
              </p>
            </div>
          )}

          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <Button
            type="button"
            className="gap-2"
            disabled={!importPreview || importData.isPending}
            onClick={() => void handleImport()}
          >
            <Upload className="h-4 w-4" />
            {importData.isPending ? "Importing…" : "Import and merge"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
