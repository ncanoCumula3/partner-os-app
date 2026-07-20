/**
 * AuthContext — who is logged in. Supports two paths:
 *   1. Per-user email + password (POST /api/auth/login → hashed check server-side)
 *   2. The legacy shared access code (2274) as a fallback for the demo.
 * Session is kept in sessionStorage so a refresh stays signed in.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User } from "@/lib/users";
import { can as roleCan, type Capability } from "@/lib/permissions";

const SESSION_KEY = "partner_os_session";      // { user, token }
const CODE_KEY = "partner_os_access_granted";  // "true"

interface AuthContextValue {
  user: User | null;
  authenticated: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithCode: (code: string) => Promise<boolean>;
  logout: () => void;
  can: (cap: Capability) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: User };
        if (parsed?.user) setUser(parsed.user);
      }
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

  const loginWithCode = useCallback(async (code: string) => {
    try {
      const res = await fetch("/api/auth/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { user: User; token: string };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(CODE_KEY);
    setUser(null);
  }, []);

  const authenticated = !!user;
  const can = useCallback((cap: Capability) => roleCan(user?.role, cap), [user]);

  return (
    <AuthContext.Provider value={{ user, authenticated, ready, login, loginWithCode, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
