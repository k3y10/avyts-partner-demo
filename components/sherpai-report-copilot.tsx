import Image from "next/image";
import { Radar, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildBriefingDigest } from "@/lib/sherpai";
import type { DailyBriefing, ForecastZone } from "@/types/terrain";

export function SherpAIReportCopilot({ briefing, zone }: { briefing: DailyBriefing; zone: ForecastZone }) {
  const realOnlyMode = process.env.NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA !== "0";
  const digest = buildBriefingDigest(briefing, zone);

  return (
    <Card className="glass-card h-fit overflow-hidden">
      <CardHeader className="border-b border-white/50">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
          {realOnlyMode ? null : <Image src="/brand/sherpai.png" alt="SherpAI" width={18} height={18} className="rounded-full" />}
          {realOnlyMode ? "Briefing Digest" : "SherpAI Briefing Copilot"}
        </div>
        <CardTitle className="text-[1.1rem]">{digest.headline}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="rounded-[1.25rem] border border-slate-900/8 bg-slate-950 p-5 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-sky-300" />Operator digest</div>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-200">
            {digest.bullets.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/70 bg-white/80 p-4 text-sm leading-6 text-slate-700">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><Radar className="h-4 w-4 text-sky-700" />Recommended next action</div>
          <p className="mt-2">{digest.action}</p>
        </div>
      </CardContent>
    </Card>
  );
}