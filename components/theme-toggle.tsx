"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}