import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";

export type AppMode = "app" | "admin";

const STORAGE_KEY = "timefairy-app-mode";

type AppModeContextValue = {
  mode: AppMode;
  isAdminMode: boolean;
  canUseAdminMode: boolean;
  enterAdminMode: () => void;
  exitAdminMode: () => void;
  toggleAdminMode: () => void;
};

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AppMode>("app");

  useEffect(() => {
    if (!isAdmin) {
      setMode("app");
      return;
    }
    const admin = location.pathname.startsWith("/app/admin");
    setMode(admin ? "admin" : "app");
    localStorage.setItem(STORAGE_KEY, admin ? "admin" : "app");
  }, [isAdmin, location.pathname]);

  const enterAdminMode = useCallback(() => {
    if (!isAdmin) return;
    localStorage.setItem(STORAGE_KEY, "admin");
    setMode("admin");
    navigate("/app/admin/users");
  }, [isAdmin, navigate]);

  const exitAdminMode = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "app");
    setMode("app");
    navigate("/app/dashboard");
  }, [navigate]);

  const toggleAdminMode = useCallback(() => {
    if (mode === "admin") exitAdminMode();
    else enterAdminMode();
  }, [mode, enterAdminMode, exitAdminMode]);

  const value = useMemo<AppModeContextValue>(
    () => ({
      mode,
      isAdminMode: mode === "admin",
      canUseAdminMode: isAdmin,
      enterAdminMode,
      exitAdminMode,
      toggleAdminMode,
    }),
    [mode, isAdmin, enterAdminMode, exitAdminMode, toggleAdminMode],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within AppModeProvider");
  return ctx;
}
