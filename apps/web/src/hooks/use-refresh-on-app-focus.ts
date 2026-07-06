import { useEffect } from "react";

export function useRefreshOnAppFocus(refresh: () => void) {
  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== "visible") return;
      refresh();
    };

    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener("pageshow", run);

    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", run);
    };
  }, [refresh]);
}
