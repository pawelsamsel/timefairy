import { useEffect, useState } from "react";
import { toDateInputValue } from "./datetime";

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;

function loadSessionDate(storageKey: string): string {
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored && DATE_INPUT_RE.test(stored)) {
      return stored;
    }
  } catch {
    // sessionStorage unavailable (e.g. private mode restrictions)
  }
  return toDateInputValue(new Date());
}

export function useSessionDate(storageKey: string) {
  const [selectedDate, setSelectedDate] = useState(() => loadSessionDate(storageKey));

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, selectedDate);
    } catch {
      // ignore write failures
    }
  }, [storageKey, selectedDate]);

  return [selectedDate, setSelectedDate] as const;
}
