"use client";

import { useMemo, useState } from "react";
import { ReportSummary } from "@/components/report-summary";
import { SherpAIReportCopilot } from "@/components/sherpai-report-copilot";

const EMPTY_ZONES: never[] = [];
import { LoadingState, ErrorState } from "@/components/states";
import { ZoneList } from "@/components/zone-list";
import { useCurrentForecast } from "@/hooks/use-current-forecast";
import { useDailyBriefing } from "@/hooks/use-daily-briefing";
import { DEFAULT_ZONE_ID } from "@/lib/constants";

export default function ReportsPage() {
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONE_ID);
  const zonesQuery = useCurrentForecast();
  const briefingQuery = useDailyBriefing(selectedZoneId);
  const zones = zonesQuery.data?.zones ?? EMPTY_ZONES;
  const briefing = briefingQuery.data;
  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) ?? zones[0], [selectedZoneId, zones]);

  if (zonesQuery.isLoading || briefingQuery.isLoading || !selectedZone || !briefing) {
    return <div className="container py-10"><LoadingState title="Loading daily briefing" description="Preparing an operations-ready summary with route and hazard context." /></div>;
  }
  if (zonesQuery.isError || briefingQuery.isError) {
    return <div className="container py-10"><ErrorState title="Daily briefing unavailable" description="The briefing service did not return a valid response." /></div>;
  }

  return (
    <div className="container grid gap-6 py-8 xl:grid-cols-[320px,1fr] xl:items-stretch">
      <div className="h-full rounded-[1.4rem] border border-white/70 bg-white/84 p-4 shadow-[0_24px_54px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/72">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Forecast zones</div>
        <ZoneList zones={zones} selectedZoneId={selectedZone.id} onSelect={setSelectedZoneId} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),340px]">
        <ReportSummary briefing={briefing} />
        <SherpAIReportCopilot briefing={briefing} zone={selectedZone} />
      </div>
    </div>
  );
}
