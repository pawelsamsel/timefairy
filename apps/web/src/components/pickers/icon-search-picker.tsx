import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PickerItem = {
  id: string;
  label: string;
  hint?: string;
  color?: string;
};

type Props = {
  icon: LucideIcon;
  title: string;
  items: PickerItem[];
  value?: string;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  searchPlaceholder?: string;
  footer?: React.ReactNode;
  accentColor?: string;
  pinnedIds?: ReadonlySet<string>;
  onTogglePin?: (id: string) => void;
};

function matchesPickerQuery(item: PickerItem, query: string): boolean {
  return (
    item.label.toLowerCase().includes(query) ||
    (item.hint?.toLowerCase().includes(query) ?? false)
  );
}

export function IconSearchPicker({
  icon: Icon,
  title,
  items,
  value,
  onChange,
  disabled,
  allowClear,
  clearLabel = "None",
  searchPlaceholder,
  footer,
  accentColor,
  pinnedIds,
  onTogglePin,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = items.find((i) => i.id === value);
  const q = query.trim().toLowerCase();

  const { pinnedItems, unpinnedItems } = useMemo(() => {
    const filtered = q ? items.filter((item) => matchesPickerQuery(item, q)) : items;
    if (!pinnedIds || pinnedIds.size === 0) {
      return { pinnedItems: [] as PickerItem[], unpinnedItems: filtered };
    }

    const filteredById = new Map(filtered.map((item) => [item.id, item]));
    const pinnedItems = [...pinnedIds]
      .map((id) => filteredById.get(id))
      .filter((item): item is PickerItem => item != null);
    const unpinnedItems = filtered.filter((item) => !pinnedIds.has(item.id));

    return { pinnedItems, unpinnedItems };
  }, [items, pinnedIds, q]);

  const hasMatches = pinnedItems.length > 0 || unpinnedItems.length > 0;

  function pick(id: string | undefined) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  function renderItem(item: PickerItem) {
    const active = item.id === value;
    const pinned = pinnedIds?.has(item.id) ?? false;

    return (
      <li key={item.id}>
        <div
          className={cn(
            "flex w-full items-center gap-1 rounded-md hover:bg-muted/60",
            active && "bg-muted/50",
          )}
        >
          <button
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => pick(item.id)}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm",
              active && "font-medium",
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              <span className="flex items-center gap-2 truncate">
                {item.color && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="truncate">{item.label}</span>
              </span>
              {item.hint && (
                <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
              )}
            </span>
            {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>
          {onTogglePin ? (
            <button
              type="button"
              className={cn(
                "mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                pinned && "text-primary hover:text-primary",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin(item.id);
              }}
              aria-label={pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
              aria-pressed={pinned}
            >
              <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current")} />
            </button>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          title={selected ? `${title}: ${selected.label}` : title}
          className={cn(
            "h-8 w-8 shrink-0 border-border/80",
            value && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
          )}
          style={
            accentColor
              ? {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}18`,
                  color: accentColor,
                }
              : undefined
          }
        >
          <Icon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="border-b border-border/40 p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}…`}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <ul className="max-h-56 overflow-y-auto p-1" role="listbox" aria-label={title}>
          {allowClear && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => pick(undefined)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60",
                  !value && "bg-muted/50 font-medium",
                )}
              >
                <span className="flex-1 text-muted-foreground">{clearLabel}</span>
                {!value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </li>
          )}
          {!hasMatches ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">No matches</li>
          ) : (
            <>
              {pinnedItems.map((item) => renderItem(item))}
              {pinnedItems.length > 0 && unpinnedItems.length > 0 ? (
                <li className="my-1 border-t border-border/40" role="separator" />
              ) : null}
              {unpinnedItems.map((item) => renderItem(item))}
            </>
          )}
        </ul>
        {footer ? <div className="border-t border-border/40 p-2">{footer}</div> : null}
      </PopoverContent>
    </Popover>
  );
}
