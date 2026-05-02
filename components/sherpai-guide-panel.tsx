import { ShieldAlert, Sparkles } from "lucide-react";
import { SherpAIWindow } from "./sherpai-window";
import type { DangerRating } from "@/types/terrain";

export interface SherpAIGuideModel {
  roleLabel: string;
  modeLabel: string;
  stance: DangerRating;
  score: number;
  zoneBaseline: DangerRating;
  contextPills: string[];
  systemLabel: string;
  headline: string;
  summary: string;
  forecastTitle: string;
  forecastNarrative: string;
  confidenceLabel: string;
  actionItems: string[];
  watchItems: string[];
  supportingFactors: string[];
  suggestedPrompts: string[];
  handoff: string;
}

export function SherpAIGuidePanel({ guide }: { guide: SherpAIGuideModel }) {
  function buildAgentReply(prompt: string) {
    const normalized = prompt.toLowerCase();
    if (/(why|different|zone|baseline)/.test(normalized)) {
      return `This cell is rated ${guide.stance} while the zone baseline is ${guide.zoneBaseline}. The difference comes from cell-specific terrain evidence rather than the broad zone label. ${guide.supportingFactors[0] ?? guide.summary}`;
    }
    if (/(route|go|no-go|caution|move)/.test(normalized)) {
      return `Operationally, I would treat this terrain as ${guide.stance}. Start with: ${guide.actionItems[0]} Then validate with: ${guide.actionItems[1]}`;
    }
    if (/(weather|wind|loading|snow)/.test(normalized)) {
      return `Weather context is part of the read, but not the only driver. ${guide.supportingFactors.find((item) => /weather|wind|loading/i.test(item)) ?? guide.watchItems[0]}`;
    }
    if (/(trap|terrain|consequence|runout)/.test(normalized)) {
      return `${guide.supportingFactors.find((item) => /trap|terrain|consequence/i.test(item)) ?? guide.watchItems[1] ?? guide.summary}`;
    }
    return `${guide.summary} Primary follow-through: ${guide.actionItems[0]} Monitoring priority: ${guide.watchItems[0]}`;
  }

  return (
    <SherpAIWindow
      kicker="Terrain guide"
      title={guide.headline}
      summary={guide.summary}
      modeLabel={guide.modeLabel}
      contextPills={guide.contextPills.slice(0, 2)}
      suggestedPrompts={guide.suggestedPrompts}
      handoff={guide.handoff}
      introMessage={`I’m tracking this cell as ${guide.stance} with a terrain score of ${guide.score.toFixed(2)}. Ask about route posture, why the cell differs from the zone, or what factor is driving the read.`}
      buildReply={buildAgentReply}
      chatContextLabel="Selected cell"
      showPromptPack={false}
      quickReplyCount={1}
      composerRows={2}
      hideModeBadge
      contentScrollable={false}
      chatScrollable={false}
      showContextPills={false}
      showChatContextLabel={false}
      chatTitle="Guide chat"
      collapsibleChat
      defaultChatOpen={false}
    >
        <div className="rounded-[1rem] bg-slate-50 p-4 dark:bg-white/5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">Brief</div>
          <div className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{guide.forecastTitle}</div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{guide.forecastNarrative}</p>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="rounded-[1rem] bg-slate-50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ShieldAlert className="h-4 w-4 text-sky-700 dark:text-sky-300" /> Do now
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              {guide.actionItems.slice(0, 2).map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[1rem] bg-slate-50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-sky-700 dark:text-sky-300" /> Key reason
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              {guide.supportingFactors.slice(0, 1).map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>
          </div>
        </div>
    </SherpAIWindow>
  );
}