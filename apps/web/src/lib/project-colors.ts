export const PROJECT_PRESET_COLORS = [
  "#00509d",
  "#003f88",
  "#00296b",
  "#22c55e",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#64748b",
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_PRESET_COLORS[0];

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_RE.test(withHash)) return null;
  return withHash.toLowerCase();
}

export function entryDisplayColor(entry: {
  project?: { color?: string } | null;
  lane?: { color?: string } | null;
}): string {
  return entry.project?.color ?? entry.lane?.color ?? "var(--color-steel-azure)";
}
