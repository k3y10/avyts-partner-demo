"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, FileText, Map, Menu, Mountain, Radio, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_ICONS = {
  "/": Mountain,
  "/map": Map,
  "/conditions": BarChart3,
  "/observations": Radio,
  "/reports": FileText,
};

export function AppHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMapRoute = pathname === "/map";
  const isLoginRoute = pathname === "/login";

  return (
    <header className="sticky top-0 z-50 glass-panel border-b">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/avyts-logo.png" alt="AvyTS" width={isMapRoute ? 50 : 50} height={isMapRoute ? 50 : 50} className="rounded-xl" priority />
          <div>
            <div className="text-lg font-bold leading-tight tracking-tight text-foreground">AvyTS</div>
            <p className="text-[10px] leading-tight text-muted-foreground">By TerraSatch</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            (() => {
              const Icon = NAV_ICONS[item.href as keyof typeof NAV_ICONS] ?? Mountain;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })()
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <form action="/api/auth/logout" method="POST">
              <button className="rounded-full border border-border bg-white/70 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white hover:text-foreground dark:bg-slate-900/70">Sign out</button>
            </form>
          ) : !isLoginRoute ? (
            <Link href="/login" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">Admin login</Link>
          ) : null}
          <PwaInstallButton />
          <ThemeToggle />
        </div>

        <button className="inline-flex rounded-full border border-border bg-white/70 p-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/65 md:hidden" onClick={() => setMobileOpen((value) => !value)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-white/90 backdrop-blur-2xl dark:bg-slate-950/92 md:hidden">
          <div className="container grid gap-2 py-4">
            <div className="flex items-center gap-2 pb-2">
              {isAuthenticated ? (
                <form action="/api/auth/logout" method="POST">
                  <button className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Sign out</button>
                </form>
              ) : !isLoginRoute ? (
                <Link href="/login" className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white dark:bg-sky-500 dark:text-slate-950">Admin login</Link>
              ) : null}
              <PwaInstallButton />
              <ThemeToggle />
            </div>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {(() => {
                  const Icon = NAV_ICONS[item.href as keyof typeof NAV_ICONS] ?? Mountain;
                  return <Icon className="h-4 w-4" />;
                })()}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
