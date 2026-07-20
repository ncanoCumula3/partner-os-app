/**
 * AuthContext — who is logged in. Supports two paths:
 *   1. Per-user email + password (POST /api/auth/login → hashed check server-side)
 *   2. The legacy shared access code (2274) as a fallback for the demo.
 * Session is kept in sessionStorage so a refresh stays signed in.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User } from "@/lib/users";

const ACCESS_CODE = "2274";
const SESSION_KEY = "partner_os_session";      // { user, token }
const CODE_KEY = "partner_os_access_granted";  // "true"

interface AuthContextValue {
  user: User | null;          // null when signed in via shared code
  authenticated: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithCode: (code: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [codeGranted, setCodeGranted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: User };
        if (parsed?.user) setUser(parsed.user);
      }
      if (sessionStorage.getItem(CODE_KEY) === "true") setCodeGranted(true);
    } catch {
      /* ignore corrupt session */
    }
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body.error || "Invalid email or password" };
      }
      const data = (await res.json()) as { user: User; token: string };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error — try again" };
    }
  }, []);

  const loginWithCode = useCallback((code: string) => {
    if (code === ACCESS_CODE) {
      sessionStorage.setItem(CODE_KEY, "true");
      setCodeGranted(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(CODE_KEY);
    setUser(null);
    setCodeGranted(false);
  }, []);

  const authenticated = !!user || codeGranted;

  return (
    <AuthContext.Provider value={{ user, authenticated, ready, login, loginWithCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
