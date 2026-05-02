import Link from "next/link";
import { ArrowUpRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { DEFAULT_PROTECTED_REDIRECT, isAuthConfigured, normalizeRedirectPath } from "@/lib/auth";

function errorCopy(error?: string) {
  if (error === "invalid") {
    return "The email, username, or password was not accepted.";
  }
  if (error === "config") {
    return "Access auth is not configured yet. Set the server-side auth environment variables before using this gate.";
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const redirectValue = Array.isArray(resolvedParams.redirect) ? resolvedParams.redirect[0] : resolvedParams.redirect;
  const errorValue = Array.isArray(resolvedParams.error) ? resolvedParams.error[0] : resolvedParams.error;
  const redirectTo = normalizeRedirectPath(redirectValue ?? DEFAULT_PROTECTED_REDIRECT);
  const errorMessage = errorCopy(errorValue);
  const configured = isAuthConfigured();

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[radial-gradient(circle_at_14%_0%,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_88%_8%,rgba(249,115,22,0.1),transparent_18%),linear-gradient(180deg,#f8fcff_0%,#eef5fb_48%,#e6eef6_100%)] px-4 py-12 dark:bg-[radial-gradient(circle_at_14%_0%,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_88%_8%,rgba(249,115,22,0.1),transparent_18%),linear-gradient(180deg,#07111b_0%,#0b1724_48%,#102130_100%)]">
      <div className="pointer-events-none absolute -left-12 top-20 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-64 w-64 rounded-full bg-orange-400/12 blur-3xl" />

      <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[minmax(0,1.08fr),420px] xl:items-stretch">
        <section className="relative overflow-hidden rounded-[2.15rem] border border-white/70 bg-white/80 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/72 xl:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.06),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
            <ShieldCheck className="h-3.5 w-3.5" /> TerraSatch Access Gate
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">Private access for the AvyTS working environment.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              The public landing page stays visible at avy.terrasatch.com while the internal terrain workspace, conditions tools, observation intake, and reporting flow stay behind this login until launch or partner review.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/82 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/72">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Protected now</div>
                <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">Internal operations surfaces</div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Map workspace, conditions, observations, reports, and the protected internal API routes that support partner review.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/82 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/72">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Still public</div>
                <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">Landing and product framing</div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">The public entry experience and any launch-facing marketing content you want visible before production release.</p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-white/70 bg-white/78 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/72">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-sky-500/20 dark:text-sky-100">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-950 dark:text-white">Pre-production control layer</div>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Use this gate to keep active development, live-data verification, and operator workflow tuning private until the production cutover is ready.</p>
              </div>
            </div>

            <div className="mt-8 text-sm text-slate-500 dark:text-slate-400">
              Need the public entry point instead? <Link href="/" className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200">Return to the landing page <ArrowUpRight className="h-3.5 w-3.5" /></Link>.
            </div>
          </div>
        </section>

        <section className="rounded-[2.15rem] border border-slate-200 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-950 xl:p-9">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-sky-400/20 dark:text-sky-100">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Secure Login</div>
              <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Access the internal workspace</div>
            </div>
          </div>

          <form action="/api/auth/login" method="POST" className="mt-8 space-y-5">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-slate-900 dark:text-slate-100">Email or username</span>
              <input name="username" autoComplete="username" placeholder="you@example.com" className="h-12 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.12)] dark:border-white/10 dark:bg-slate-900 dark:text-white" />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="font-medium text-slate-900 dark:text-slate-100">Password</span>
              <input name="password" type="password" autoComplete="current-password" className="h-12 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(56,189,248,0.12)] dark:border-white/10 dark:bg-slate-900 dark:text-white" />
            </label>
            {errorMessage ? <p className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">{errorMessage}</p> : null}
            {!configured ? <p className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">Set AVYTS_AUTH_SECRET plus either the admin credentials or AVYTS_ALLOWED_USERS on the server before this login can succeed.</p> : null}
            <button type="submit" className="flex h-12 w-full items-center justify-center rounded-[1rem] bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
              Continue to the workspace
            </button>
            <p className="text-center text-xs leading-6 text-slate-500 dark:text-slate-400">Successful login returns you directly to the protected route you requested.</p>
          </form>
        </section>
      </div>
    </div>
  );
}