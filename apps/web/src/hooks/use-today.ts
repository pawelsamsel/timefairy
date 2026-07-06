import { useEffect, useState } from "react";
import { toDateInputValue } from "@/lib/datetime";

export function useToday(): string {
  const [today, setToday] = useState(() => toDateInputValue(new Date()));

  useEffect(() => {
    const sync = () => setToday(toDateInputValue(new Date()));

    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);

    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  return today;
}
