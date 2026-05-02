"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  const color = theme === "dark" ? "#020817" : "#133b63";
  if (meta) {
    meta.setAttribute("content", color);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("avyts-theme");
    const nextTheme = stored === "dark" ? "dark" : "light";
    setThemeState(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme: ThemeMode) => {
        setThemeState(nextTheme);
        window.localStorage.setItem("avyts-theme", nextTheme);
        applyTheme(nextTheme);
      },
      toggleTheme: () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        setThemeState(nextTheme);
        window.localStorage.setItem("avyts-theme", nextTheme);
        applyTheme(nextTheme);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}