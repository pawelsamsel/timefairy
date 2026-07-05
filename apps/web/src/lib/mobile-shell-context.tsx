import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MobileFabConfig = {
  onClick: () => void;
  ariaLabel?: string;
};

type MobileShellContextValue = {
  fab: MobileFabConfig | null;
  setFab: (fab: MobileFabConfig | null) => void;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

const MobileShellContext = createContext<MobileShellContextValue | null>(null);

export function MobileShellProvider({ children }: { children: ReactNode }) {
  const [fab, setFabState] = useState<MobileFabConfig | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const setFab = useCallback((next: MobileFabConfig | null) => {
    setFabState(next);
  }, []);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const value = useMemo(
    () => ({ fab, setFab, menuOpen, openMenu, closeMenu }),
    [closeMenu, fab, menuOpen, openMenu, setFab],
  );

  return <MobileShellContext.Provider value={value}>{children}</MobileShellContext.Provider>;
}

export function useMobileShell(): MobileShellContextValue {
  const ctx = useContext(MobileShellContext);
  if (!ctx) {
    throw new Error("useMobileShell must be used within MobileShellProvider");
  }
  return ctx;
}
