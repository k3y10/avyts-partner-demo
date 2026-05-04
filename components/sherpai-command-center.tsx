"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronUp, FileAudio, MapPinned, RadioTower, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SherpAIWindow } from "./sherpai-window";
import { cn } from "@/lib/utils";

const PATH_COPY: Record<string, { title: string; description: string; modeLabel: string; contextPills: string[]; prompts: string[] }> = {
  "/map": {
    title: "Terrain copilot online",
    description: "Ask SherpAI for terrain-cell context, overlay interpretation, and route caution language.",
    modeLabel: "Terrain workspace",
    contextPills: ["Map", "Hex overlays", "Route context"],
    prompts: [
      "Summarize what the map is showing right now in operator language.",
      "Explain how to read the current hex colors against the zone forecast.",
      "Tell me what to verify before committing to the next terrain feature.",
    ],
  },
  "/observations": {
    title: "Observation intake online",
    description: "SherpAI can turn field notes, attachments, and radio transcripts into structured observation drafts.",
    modeLabel: "Observation intake",
    contextPills: ["Observation studio", "Structured draft", "Field reports"],
    prompts: [
      "What fields are still missing from the current observation draft?",
      "Turn my field notes into a tighter avalanche observation summary.",
      "What follow-up questions should I ask before I publish this report?",
    ],
  },
  "/reports": {
    title: "Briefing copilot online",
    description: "Use SherpAI to compress the current report into operator-ready talking points.",
    modeLabel: "Briefing mode",
    contextPills: ["Briefing digest", "Operational summary", "Team handoff"],
    prompts: [
      "Turn the current report into a 30-second team brief.",
      "What are the top two operational concerns in this report?",
      "Give me a patrol-ready summary with go / caution / no-go language.",
    ],
  },
};

export function SherpAICommandCenter() {
  const pathname = usePathname();
  const realOnlyMode = process.env.NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA !== "0";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const copy = useMemo(() => PATH_COPY[pathname] ?? {
    title: "SherpAI online",
    description: "A terrain-aware agent for map context, reports, and field observation intake.",
    modeLabel: "Cross-site copilot",
    contextPills: ["Global agent", "Page-aware", "SherpAI online"],
    prompts: [
      "Explain what this page is for and what SherpAI can do here.",
      "Tell me the fastest next step to use this page well.",
      "Translate this page into a field-ready workflow.",
    ],
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (realOnlyMode || !mounted || pathname === "/map" || pathname === "/login") {
    return null;
  }

  function buildReply(prompt: string) {
    const normalized = prompt.toLowerCase();
    if (/(page|here|mode|what is this)/.test(normalized)) {
      return `${copy.title}. ${copy.description} Current mode is ${copy.modeLabel.toLowerCase()}, so I’m staying focused on the active page workflow instead of generic site help.`;
    }
    if (/(next|step|do|start)/.test(normalized)) {
      return pathname === "/map"
        ? "Start by reading the active overlay against the hex-derived zone forecast, then click a terrain cell to inspect the SherpAI evidence trail."
        : pathname === "/observations"
          ? "Start by capturing the source, location, and raw notes, then let SherpAI shape that into a structured observation draft before publish."
          : pathname === "/reports"
            ? "Start by reviewing the digest headline, then ask SherpAI to compress it into patrol-ready talking points or a go / caution / no-go brief."
            : "Start by opening the map workspace if you need terrain intelligence, or stay here and ask SherpAI for a page-level walkthrough.";
    }
    if (/(map|terrain|hex)/.test(normalized)) {
      return "SherpAI treats the map as a terrain decision surface: zone forecast for context, hexes for localized hazard, and the drawer for the evidence trail behind each cell.";
    }
    if (/(report|brief|digest)/.test(normalized)) {
      return "SherpAI uses the report flow to turn longer narrative into operator language, preserving the most important concerns and handoff points.";
    }
    if (/(observation|field|draft|radio)/.test(normalized)) {
      return "SherpAI uses the observation flow to structure notes, transcripts, and uploads into consistent field reports with clearer follow-up questions.";
    }
    return `${copy.description} Ask for a terrain brief, observation help, or report compression and I’ll stay inside the context of this page.`;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px]",
      )}
    >
      {open ? (
        <div className="pointer-events-auto w-full transition-colors duration-200 sm:max-w-[360px]">
          <SherpAIWindow
            kicker="SherpAI"
            title={copy.modeLabel}
            summary={`Focused on ${copy.modeLabel.toLowerCase()}. Ask what this page does, what to do next, or jump to another workflow.`}
            modeLabel={copy.modeLabel}
            contextPills={copy.contextPills}
            suggestedPrompts={copy.prompts}
            handoff="SherpAI stays in one interface across the site so terrain, observations, and reports all share the same operating context."
            introMessage={`I’m in ${copy.modeLabel.toLowerCase()} mode. Ask what this page is for, what to do next, or jump to another workflow.`}
            buildReply={buildReply}
            showPromptPack={false}
            quickReplyCount={1}
            composerRows={2}
            hideModeBadge
            showContextPills={false}
            showQuickReplies={false}
            showChatContextLabel={false}
            chatTitle="Ask SherpAI"
            className="max-h-[min(72vh,640px)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Jump to</div>
              <button onClick={() => setOpen(false)} aria-label="Close SherpAI window" className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors duration-150 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400/30 dark:hover:bg-slate-800 dark:hover:text-white">
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <QuickLink href="/map" icon={MapPinned} label="Terrain" active={pathname === "/map"} />
              <QuickLink href="/observations" icon={FileAudio} label="Observe" active={pathname === "/observations"} />
              <QuickLink href="/reports" icon={RadioTower} label="Reports" active={pathname === "/reports"} className="col-span-2" />
            </div>
          </SherpAIWindow>
        </div>
      ) : null}
      <Button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "pointer-events-auto h-14 rounded-full border px-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)] transition-colors duration-150",
          open
            ? "border-sky-700 bg-sky-700 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950"
            : "border-sky-700 bg-sky-700 text-white hover:bg-sky-800 dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400",
        )}
      >
        <Image src="/brand/sherpai.png" alt="SherpAI" width={22} height={22} className="mr-2 rounded-full" /> SherpAI
      </Button>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, active, className }: { href: string; icon: LucideIcon; label: string; active: boolean; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-[0.95rem] border px-3 py-2.5 text-sm font-medium transition-colors duration-150",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] dark:border-sky-400/20 dark:bg-slate-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-sky-400/25 dark:hover:bg-slate-900 dark:hover:text-white",
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}