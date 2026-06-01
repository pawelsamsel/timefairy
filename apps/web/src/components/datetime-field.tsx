import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinDatetimeLocal, splitDatetimeLocal } from "@/lib/datetime";

type DateTimeFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  required?: boolean;
};

export function DateTimeField({ id, label, value, onChange, min, required }: DateTimeFieldProps) {
  const { date, time } = splitDatetimeLocal(value);
  const minParts = min ? splitDatetimeLocal(min) : null;

  const minDate = minParts?.date;
  const minTime = minParts && date === minParts.date ? minParts.time : undefined;

  function updateDate(nextDate: string) {
    onChange(joinDatetimeLocal(nextDate, time || "09:00"));
  }

  function updateTime(nextTime: string) {
    onChange(joinDatetimeLocal(date, nextTime));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-date`}>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          id={`${id}-date`}
          type="date"
          value={date}
          min={minDate}
          onChange={(e) => updateDate(e.target.value)}
          required={required}
          className="min-h-10 native-picker-input"
        />
        <Input
          id={`${id}-time`}
          type="time"
          value={time}
          min={minTime}
          step={300}
          onChange={(e) => updateTime(e.target.value)}
          required={required}
          className="min-h-10 native-picker-input"
        />
      </div>
    </div>
  );
}
