import { useEffect, useState } from "react";
import {
  DEFAULT_PROJECT_COLOR,
  normalizeHexColor,
  PROJECT_PRESET_COLORS,
} from "@/lib/project-colors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ProjectColorPicker({ value, onChange }: Props) {
  const normalized = normalizeHexColor(value) ?? DEFAULT_PROJECT_COLOR;
  const [customInput, setCustomInput] = useState(normalized);

  useEffect(() => {
    setCustomInput(normalized);
  }, [normalized]);

  const isCustom = !PROJECT_PRESET_COLORS.some((c) => c.toLowerCase() === normalized);

  function selectPreset(color: string) {
    onChange(color);
    setCustomInput(color);
  }

  function applyCustomInput(raw: string) {
    setCustomInput(raw);
    const next = normalizeHexColor(raw);
    if (next) onChange(next);
  }

  return (
    <div className="space-y-3">
      <Label>Color</Label>
      <div className="flex flex-wrap gap-2">
        {PROJECT_PRESET_COLORS.map((color) => {
          const active = normalized === color;
          return (
            <button
              key={color}
              type="button"
              aria-label={color}
              title={color}
              onClick={() => selectPreset(color)}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
                active ? "border-foreground ring-2 ring-primary/30" : "border-transparent",
              )}
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={normalized}
          onChange={(e) => applyCustomInput(e.target.value)}
          className="h-10 w-14 shrink-0 cursor-pointer p-1"
          aria-label="Custom color"
        />
        <Input
          value={customInput}
          onChange={(e) => applyCustomInput(e.target.value)}
          placeholder="#00509d"
          className="font-mono text-sm"
          maxLength={7}
        />
        {isCustom && (
          <span
            className="h-8 w-8 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: normalized }}
            title="Selected custom color"
          />
        )}
      </div>
    </div>
  );
}
