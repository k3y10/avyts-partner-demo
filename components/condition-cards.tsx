import { CloudSnow, Mountain, Thermometer, Wind } from "lucide-react";
import { MetricPill } from "@/components/metric-pill";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ForecastZone } from "@/types/terrain";

export function ConditionCards({ zone }: { zone: ForecastZone }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
      <Card className="topo-panel">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>{zone.name} summary</CardTitle>
            <StatusBadge status={zone.danger.overall} />
            <StatusBadge status={zone.confidence} confidence />
          </div>
          <CardDescription>{zone.forecastHeadline}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-7 text-muted-foreground">{zone.summary}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill icon={CloudSnow} label="Recent snowfall" value={`${zone.recentSnowfallIn} in / 24h`} />
            <MetricPill icon={Wind} label="Wind" value={`${zone.windDirection} ${zone.windSpeedMph} mph`} />
            <MetricPill icon={Thermometer} label="Temperature" value={`${zone.temperatureF}°F`} />
          </div>
          {zone.snowForecast ? (
            <div className="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Storm window</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{zone.snowForecast.summary}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <MetricPill icon={CloudSnow} label="Next 24h" value={formatInches(zone.snowForecast.next24hIn)} />
                <MetricPill icon={CloudSnow} label="Next 72h" value={formatInches(zone.snowForecast.next72hIn)} />
                <MetricPill icon={Mountain} label="Snow level" value={formatSnowLevel(zone.snowForecast.snowLevelFt)} />
                <MetricPill icon={Wind} label="Precip chance" value={formatPercent(zone.snowForecast.precipitationProbabilityPercent)} />
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <BandCard label="Above treeline" status={zone.danger.aboveTreeline} />
            <BandCard label="Near treeline" status={zone.danger.nearTreeline} />
            <BandCard label="Below treeline" status={zone.danger.belowTreeline} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Avalanche problems</CardTitle>
          <CardDescription>Primary problems being carried in the current zone forecast.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {zone.avalancheProblems.map((problem) => (
            <div key={problem.id} className="rounded-[1.25rem] border border-border bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">{problem.type}</div>
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{problem.size}</div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{problem.discussion}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">{problem.likelihood} · {problem.elevation} · {problem.aspect.join(" / ")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function formatInches(value: number | null) {
  return value === null ? "--" : `${value} in`;
}

function formatSnowLevel(value: number | null) {
  return value === null ? "Variable" : `${value.toLocaleString()} ft`;
}

function formatPercent(value: number | null) {
  return value === null ? "--" : `${Math.round(value)}%`;
}

function BandCard({ label, status }: { label: string; status: ForecastZone["danger"]["overall"] }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-white/90 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <StatusBadge status={status} className="mt-3" />
    </div>
  );
}
