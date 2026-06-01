import type { TimeEntrySummary, TimeEntryWithRelations } from "@timefairy/shared-types";
import { formatEntryTimePrefix } from "@/lib/datetime";
import { entryDisplayTitle, resolveEntryClientName } from "@/lib/entry-display";

export type ReportFilters = {
  fromDate: string;
  toDate: string;
  clientId: string | null;
  clientName: string | null;
};

function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(cells: string[]): string {
  return cells.map((c) => escapeCsvCell(c)).join(",");
}

function formatEntryDate(entry: TimeEntryWithRelations): string {
  const iso = entry.startAt ?? entry.createdAt;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatEntryTimeCell(entry: TimeEntryWithRelations): string {
  return formatEntryTimePrefix(entry.startAt, entry.endAt, entry.durationMinutes) ?? "";
}

function entryTaskLabel(entry: TimeEntryWithRelations): string {
  if (!entry.task) return "";
  const title = entry.task.title.trim();
  if (entry.task.externalId && title) return `${entry.task.externalId} · ${title}`;
  return title;
}

export type ReportRow = {
  date: string;
  time: string;
  client: string;
  project: string;
  task: string;
  title: string;
  hours: string;
  note: string;
  lane: string;
};

export function buildReportRows(
  entries: TimeEntryWithRelations[],
  projectClientIds: Map<string, string>,
  clientNames: Map<string, string>,
): ReportRow[] {
  return entries.map((entry) => ({
    date: formatEntryDate(entry),
    time: formatEntryTimeCell(entry),
    client: resolveEntryClientName(entry, clientNames, projectClientIds) ?? "",
    project: entry.project?.name ?? "",
    task: entryTaskLabel(entry),
    title: entryDisplayTitle(entry),
    hours: minutesToHours(entry.durationMinutes ?? 0),
    note: entry.note?.trim() ?? "",
    lane: entry.lane?.name ?? "",
  }));
}

export function buildReportCsv(
  filters: ReportFilters,
  summary: TimeEntrySummary[],
  rows: ReportRow[],
): string {
  const lines: string[] = [];
  const clientLabel = filters.clientName ?? "All clients";

  lines.push(csvRow(["Report", "Time Fairy"]));
  lines.push(csvRow(["Period", `${filters.fromDate} – ${filters.toDate}`]));
  lines.push(csvRow(["Client", clientLabel]));
  lines.push("");

  lines.push(csvRow(["Summary"]));
  lines.push(csvRow(["Client", "Project", "Hours"]));
  for (const row of summary) {
    lines.push(
      csvRow([
        row.clientName ?? "",
        row.projectName ?? "",
        minutesToHours(row.totalMinutes),
      ]),
    );
  }
  const totalSummaryMinutes = summary.reduce((sum, row) => sum + row.totalMinutes, 0);
  lines.push(csvRow(["", "Total", minutesToHours(totalSummaryMinutes)]));
  lines.push("");

  lines.push(csvRow(["Entries"]));
  lines.push(
    csvRow(["Date", "Time", "Client", "Project", "Task", "Title", "Hours", "Note", "Lane"]),
  );
  for (const row of rows) {
    lines.push(
      csvRow([
        row.date,
        row.time,
        row.client,
        row.project,
        row.task,
        row.title,
        row.hours,
        row.note,
        row.lane,
      ]),
    );
  }

  return lines.join("\n");
}

function mdEscapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function buildReportMarkdown(
  filters: ReportFilters,
  summary: TimeEntrySummary[],
  rows: ReportRow[],
): string {
  const clientLabel = filters.clientName ?? "All clients";
  const lines: string[] = [];

  lines.push("# Time report");
  lines.push("");
  lines.push(`- **Period:** ${filters.fromDate} – ${filters.toDate}`);
  lines.push(`- **Client:** ${clientLabel}`);
  lines.push(`- **Generated:** ${new Date().toLocaleString()}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  if (summary.length === 0) {
    lines.push("_No entries in this period._");
  } else {
    lines.push("| Client | Project | Hours |");
    lines.push("| --- | --- | ---: |");
    for (const row of summary) {
      lines.push(
        `| ${mdEscapeCell(row.clientName ?? "—")} | ${mdEscapeCell(row.projectName ?? "—")} | ${minutesToHours(row.totalMinutes)} |`,
      );
    }
    const totalSummaryMinutes = summary.reduce((sum, row) => sum + row.totalMinutes, 0);
    lines.push(`| **Total** | | **${minutesToHours(totalSummaryMinutes)}** |`);
  }
  lines.push("");

  lines.push("## Entries");
  lines.push("");
  if (rows.length === 0) {
    lines.push("_No entries in this period._");
  } else {
    lines.push("| Date | Time | Client | Project | Task | Title | Hours | Note |");
    lines.push("| --- | --- | --- | --- | --- | --- | ---: | --- |");
    for (const row of rows) {
      lines.push(
        `| ${mdEscapeCell(row.date)} | ${mdEscapeCell(row.time)} | ${mdEscapeCell(row.client)} | ${mdEscapeCell(row.project)} | ${mdEscapeCell(row.task)} | ${mdEscapeCell(row.title)} | ${row.hours} | ${mdEscapeCell(row.note)} |`,
      );
    }
    const totalEntryMinutes = rows.reduce(
      (sum, row) => sum + Math.round(parseFloat(row.hours) * 60),
      0,
    );
    lines.push(`| **Total** | | | | | | **${minutesToHours(totalEntryMinutes)}** | |`);
  }

  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function reportFilenameBase(filters: ReportFilters): string {
  const clientPart = filters.clientName
    ? filters.clientName.replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "")
    : "all-clients";
  return `timefairy-${filters.fromDate}_${filters.toDate}-${clientPart}`;
}
