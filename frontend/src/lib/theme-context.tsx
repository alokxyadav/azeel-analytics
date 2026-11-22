"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggleTheme: () => void } | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const apply = (t: Theme) => { document.documentElement.classList.toggle("dark", t === "dark"); };
  useEffect(() => {
    const s = localStorage.getItem("azeel_theme") as Theme | null;
    const t = s || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeState(t); apply(t);
  }, []);
  const setTheme = (t: Theme) => { localStorage.setItem("azeel_theme", t); setThemeState(t); apply(t); };
  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme(theme === "light" ? "dark" : "light") }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
