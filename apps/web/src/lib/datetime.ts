export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayBoundsLocal(dateStr: string): { from: string; to: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function dateRangeBounds(fromDate: string, toDate: string): { from: string; to: string } {
  const from = dayBoundsLocal(fromDate).from;
  const to = dayBoundsLocal(toDate).to;
  return { from, to };
}

export function defaultReportFromDate(): string {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + delta);
  return toDateInputValue(next);
}

export function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = toDateInputValue(new Date());
  const label = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return dateStr === today ? `${label} (today)` : label;
}

export function formatMobileDayHeaderLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function splitDatetimeLocal(value: string): { date: string; time: string } {
  if (!value || !value.includes("T")) {
    return { date: "", time: "" };
  }
  const [date, timePart] = value.split("T");
  return { date, time: timePart.slice(0, 5) };
}

export function joinDatetimeLocal(date: string, time: string): string {
  if (!date) return "";
  const t = time && /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  return `${date}T${t}`;
}

export function defaultStartLocal(forDate?: string): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.floor(d.getMinutes() / 15) * 15);
  const base = toDatetimeLocalValue(d);
  if (!forDate) return base;
  const { time } = splitDatetimeLocal(base);
  return joinDatetimeLocal(forDate, time);
}

export function isoToDatetimeLocal(iso: string): string {
  return toDatetimeLocalValue(new Date(iso));
}

export function localDatetimeToIso(local: string): string {
  return new Date(local).toISOString();
}

export function formatTimeRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  durationMinutes: number | null | undefined,
): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (startAt && endAt) {
    const mins =
      durationMinutes ??
      Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
    return `${fmt(startAt)} – ${fmt(endAt)} (${(mins / 60).toFixed(2)}h)`;
  }
  if (startAt) return fmt(startAt);
  if (durationMinutes) return `${(durationMinutes / 60).toFixed(2)}h`;
  return "—";
}

export function formatEntryTimePrefix(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  durationMinutes: number | null | undefined,
): string | null {
  if (!startAt) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const start = fmt(startAt);
  if (endAt) return `${start} – ${fmt(endAt)}`;

  if (durationMinutes != null && durationMinutes > 0) {
    const end = new Date(startAt);
    end.setMinutes(end.getMinutes() + durationMinutes);
    return `${start} – ${fmt(end.toISOString())}`;
  }

  return start;
}
