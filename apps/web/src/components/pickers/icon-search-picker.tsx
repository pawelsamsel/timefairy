import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
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
};

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
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = items.find((i) => i.id === value);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) || (i.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [items, q]);

  function pick(id: string | undefined) {
    onChange(id);
    setOpen(false);
    setQuery("");
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
            "h-9 w-9 shrink-0 border-border/80",
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
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">No matches</li>
          ) : (
            filtered.map((item) => {
              const active = item.id === value;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60",
                      active && "bg-muted/50 font-medium",
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
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        {footer ? <div className="border-t border-border/40 p-2">{footer}</div> : null}
      </PopoverContent>
    </Popover>
  );
}
