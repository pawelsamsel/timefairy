import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type MobileShellContextValue = {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  openAddLog: () => void;
  registerOpenAddLog: (handler: (() => void) | null) => void;
};

const MobileShellContext = createContext<MobileShellContextValue | null>(null);

export function MobileShellProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const openAddLogRef = useRef<(() => void) | null>(null);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const registerOpenAddLog = useCallback((handler: (() => void) | null) => {
    openAddLogRef.current = handler;
  }, []);

  const openAddLog = useCallback(() => {
    openAddLogRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ menuOpen, openMenu, closeMenu, openAddLog, registerOpenAddLog }),
    [closeMenu, menuOpen, openAddLog, openMenu, registerOpenAddLog],
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
