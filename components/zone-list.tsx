import { CloudSnow, MapPin, ShieldAlert, Thermometer, Wind } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { ZoneRiskSummary } from "@/lib/zone-risk";
import type { ForecastZone } from "@/types/terrain";

export function ZoneList({ zones, selectedZoneId, onSelect, zoneRiskSummaries, compact = false }: { zones: ForecastZone[]; selectedZoneId: string; onSelect: (zoneId: string) => void; zoneRiskSummaries?: Record<string, ZoneRiskSummary>; compact?: boolean }) {
  return (
    <div className="grid gap-3">
      {zones.map((zone) => {
        const active = zone.id === selectedZoneId;
        const zoneRisk = zoneRiskSummaries?.[zone.id];
        return (
          <button
            key={zone.id}
            onClick={() => onSelect(zone.id)}
            className={cn(
              "rounded-lg border p-4 text-left transition-all",
              active ? "border-primary bg-terrain-highlight shadow-md" : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
            )}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{zone.name}</div>
                  {!compact ? <div className="text-xs text-muted-foreground">{zone.region}</div> : null}
                  {compact && zoneRisk ? <div className="text-[11px] text-muted-foreground">{zoneRisk.cellCount} cells modeled</div> : null}
                </div>
              </div>
              <StatusBadge status={zoneRisk?.overall ?? zone.danger.overall} />
            </div>
            {!compact ? <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{zone.summary}</p> : null}
            {zoneRisk ? (
              <div className="mb-3 rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Hex-derived overall</span>
                  <span className="font-semibold capitalize text-foreground">{zoneRisk.overall}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  <span>L {zoneRisk.counts.low}</span>
                  <span>M {zoneRisk.counts.moderate}</span>
                  <span>C {zoneRisk.counts.considerable}</span>
                  <span>H {zoneRisk.counts.high}</span>
                  <span>E {zoneRisk.counts.extreme}</span>
                </div>
              </div>
            ) : null}
            {!compact ? (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground"><CloudSnow className="h-3 w-3" /><span>{zone.recentSnowfallIn} in</span></div>
                <div className="flex items-center gap-1 text-muted-foreground"><Wind className="h-3 w-3" /><span>{zone.windDirection} {zone.windSpeedMph}</span></div>
                <div className="flex items-center gap-1 text-muted-foreground"><Thermometer className="h-3 w-3" /><span>{zone.temperatureF}°F</span></div>
              </div>
            ) : null}
            {!compact && zone.avalancheProblems.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {zone.avalancheProblems.slice(0, 2).map((problem) => (
                  <span key={problem.id} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-muted-foreground">
                    <ShieldAlert className="h-3 w-3" />
                    {problem.type}
                  </span>
                ))}
              </div>
            ) : null}
            {compact ? <div className="mt-1 flex gap-3 text-xs text-muted-foreground"><span>{zone.recentSnowfallIn} in</span><span>{zone.temperatureF}°F</span></div> : null}
          </button>
        );
      })}
    </div>
  );
}
