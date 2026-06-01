import { TimefairyClient } from "@timefairy/api-client";
import type { AuthTokens, AuthUser } from "@timefairy/shared-types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export const api = new TimefairyClient(API_URL);

const TOKEN_KEY = "timefairy_tokens";
const USER_KEY = "timefairy_user";

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  sessionExpiredHandler = handler;
}

api.setSessionCallbacks({
  onTokensRefreshed: (tokens) => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },
  onSessionExpired: () => {
    clearSession();
    sessionExpiredHandler?.();
  },
});

export function loadSession(): AuthUser | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    const tokens = JSON.parse(raw) as AuthTokens;
    api.setTokens(tokens.accessToken, tokens.refreshToken);
  } catch {
    clearSession();
    return null;
  }
  const userRaw = localStorage.getItem(USER_KEY);
  return userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
}

export function saveSession(accessToken: string, refreshToken: string, user: AuthUser) {
  api.setTokens(accessToken, refreshToken);
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken, refreshToken }));
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  api.clearTokens();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function validateSession(): Promise<AuthUser | null> {
  const cached = loadSession();
  if (!cached) return null;

  try {
    const me = await api.me();
    localStorage.setItem(USER_KEY, JSON.stringify(me));
    return me;
  } catch (err) {
    const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 0;
    if (status !== 401) throw err;
  }

  const refreshed = await api.tryRefreshAccessToken();
  if (!refreshed) {
    clearSession();
    return null;
  }

  const me = await api.me();
  localStorage.setItem(USER_KEY, JSON.stringify(me));
  return me;
}
