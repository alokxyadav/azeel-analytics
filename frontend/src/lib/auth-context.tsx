"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, User, UNAUTHORIZED_EVENT } from "./api";
import { useTheme } from "./theme-context";

interface Ctx {
  user: User | null; loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>; refreshUser: () => Promise<void>;
}
const AuthContext = createContext<Ctx | undefined>(undefined);
const HINT = "azeel_has_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setTheme } = useTheme();

  // A non-sensitive hint (not the session itself) that lets anonymous visitors skip the /me request.
  const hint = { has: () => localStorage.getItem(HINT) === "1", set: () => localStorage.setItem(HINT, "1"), clear: () => localStorage.removeItem(HINT) };

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(HINT)) { setUser(null); setLoading(false); return; }
    try { setUser(await api.auth.me()); } catch { localStorage.removeItem(HINT); setUser(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refreshUser(); }, [refreshUser]);

  // A request somewhere got a 401 (session expired or password changed elsewhere).
  useEffect(() => {
    const h = () => { localStorage.removeItem(HINT); setUser(null); };
    window.addEventListener(UNAUTHORIZED_EVENT, h);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, h);
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    const u = await api.auth.login(email, password, remember); hint.set(); setUser(u); setTheme(u.theme);
  };
  const signup = async (name: string, email: string, password: string) => { const u = await api.auth.signup(name, email, password); hint.set(); setUser(u); };
  const logout = async () => { try { await api.auth.logout(); } catch {} hint.clear(); setUser(null); router.push("/login"); };

  return <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
