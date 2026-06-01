import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { AuthUser, RegisterInput } from "@timefairy/shared-types";
import { Role } from "@timefairy/shared-types";
import {
  clearSession,
  saveSession,
  setSessionExpiredHandler,
  validateSession,
} from "./api";
import { api } from "./api";

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    validateSession()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      isAdmin: user?.role === Role.ADMIN,
      async login(email, password) {
        const res = await api.login({ email, password });
        saveSession(res.accessToken, res.refreshToken, res.user);
        setUser(res.user);
      },
      async register(input) {
        const res = await api.register(input);
        saveSession(res.accessToken, res.refreshToken, res.user);
        setUser(res.user);
      },
      logout() {
        clearSession();
        setUser(null);
        navigate("/login", { replace: true });
      },
    }),
    [user, ready, navigate],
  );

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
