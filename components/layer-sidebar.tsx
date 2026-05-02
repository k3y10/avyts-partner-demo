"use client";

import { Activity, Database, Mountain, Radar, Snowflake, Wind } from "lucide-react";
import { LAYER_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ZoneRiskSummary } from "@/lib/zone-risk";
import type { ForecastZone, SourceStatus } from "@/types/terrain";
import { ZoneList } from "@/components/zone-list";

export function LayerSidebar({ zones, selectedZone, selectedZoneId, terrainCellCount, frameCellCount, stationsCount, observationCount, sourceStatus, activeOverlay, zoneRiskSummaries, onSelectZone, layers, onToggleLayer, viewMode, onViewMode }: { zones: ForecastZone[]; selectedZone: ForecastZone; selectedZoneId: string; terrainCellCount: number; frameCellCount: number; stationsCount: number; observationCount: number; sourceStatus?: SourceStatus; activeOverlay: string; zoneRiskSummaries?: Record<string, ZoneRiskSummary>; onSelectZone: (zoneId: string) => void; layers: Record<string, boolean>; onToggleLayer: (layerId: string) => void; viewMode: "regional" | "terrain-intel"; onViewMode: (viewMode: "regional" | "terrain-intel") => void; }) {
  const selectedZoneRisk = zoneRiskSummaries?.[selectedZoneId];

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-white/60 bg-white/72 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/78">
      <div className="border-b border-white/60 p-4 dark:border-white/10">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers & Zones</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Dashboard controls for terrain overlays, data coverage, and the cell model driving the active zone.</p>
      </div>
      <div className="border-b border-white/60 p-4 dark:border-white/10">
        <div className="flex overflow-hidden rounded-xl border border-white/60 text-xs dark:border-white/10">
          {[
            { id: "regional", label: "Regional" },
            { id: "terrain-intel", label: "Terrain intel" },
          ].map((mode) => (
            <button key={mode.id} onClick={() => onViewMode(mode.id as "regional" | "terrain-intel")} className={cn("flex-1 py-1.5 font-medium transition", viewMode === mode.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}>
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section className="mb-4 rounded-[1.25rem] border border-white/60 bg-white/72 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Terrain model coverage</div>
          <div className="mt-3 grid gap-2">
            <CoverageRow icon={Database} label="Frame cells" value={frameCellCount.toLocaleString()} />
            <CoverageRow icon={Database} label="Selected zone cells" value={terrainCellCount.toLocaleString()} />
            <CoverageRow icon={Radar} label="Weather stations" value={stationsCount.toString()} />
            <CoverageRow icon={Activity} label="Recent observations" value={observationCount.toString()} />
            <CoverageRow icon={Snowflake} label="Active overlay" value={activeOverlay} />
          </div>
          {selectedZoneRisk ? (
            <div className="mt-4 rounded-[1rem] border border-white/60 bg-slate-50/90 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-white">{selectedZone.name} hex distribution</div>
              <div className="mt-2 grid grid-cols-5 gap-2 text-[11px]">
                <RiskMini label="L" value={selectedZoneRisk.counts.low} />
                <RiskMini label="M" value={selectedZoneRisk.counts.moderate} />
                <RiskMini label="C" value={selectedZoneRisk.counts.considerable} />
                <RiskMini label="H" value={selectedZoneRisk.counts.high} />
                <RiskMini label="E" value={selectedZoneRisk.counts.extreme} />
              </div>
            </div>
          ) : null}
          {sourceStatus ? (
            <div className="mt-4 rounded-[1rem] border border-white/60 bg-slate-50/90 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-white">Imported-data status</div>
              <div className="mt-2 space-y-1.5">
                <p>{sourceStatus.zoneBoundaries.label}: {sourceStatus.zoneBoundaries.mode}</p>
                <p>{sourceStatus.terrainCells.label}: {sourceStatus.terrainCells.mode}</p>
                <p>{sourceStatus.forecastAdvisories.label}: {sourceStatus.forecastAdvisories.mode}</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mb-4 rounded-[1.25rem] border border-white/60 bg-white/72 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cell calculation inputs</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
            <InputRow icon={Mountain} label="Slope angle" value="Primary terrain steepness band per cell" />
            <InputRow icon={Mountain} label="Elevation" value={`${selectedZone.danger.aboveTreeline} above-treeline, ${selectedZone.danger.nearTreeline} near-treeline`} />
            <InputRow icon={Wind} label="Wind loading" value={`${selectedZone.windDirection} flow at ${selectedZone.windSpeedMph} mph with terrain-specific lee or cross loading`} />
            <InputRow icon={Snowflake} label="Snowpack context" value={`${selectedZone.recentSnowfallIn} in observed recent snowfall${selectedZone.snowForecast?.next24hIn !== null && selectedZone.snowForecast?.next24hIn !== undefined ? `, ${selectedZone.snowForecast.next24hIn} in forecast next 24h` : ""} plus zone danger baseline`} />
            <InputRow icon={Activity} label="Terrain traps" value="Runout confinement and trap proximity adjust consequence and score" />
          </div>
        </section>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data Layers</p>
        <div className="space-y-1">
          {LAYER_OPTIONS.map((layer) => (
            <button key={layer.id} onClick={() => onToggleLayer(layer.id)} className={cn("flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition", layers[layer.id] ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-muted")}>
              {layer.label}
              <span className={cn("h-2.5 w-2.5 rounded-full", layers[layer.id] ? "bg-primary" : "bg-slate-300")} />
            </button>
          ))}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Forecast Zones</p>
          <div>
            <ZoneList zones={zones} selectedZoneId={selectedZoneId} onSelect={onSelectZone} zoneRiskSummaries={zoneRiskSummaries} compact />
          </div>
        </div>
      </div>
    </aside>
  );
}

function CoverageRow({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-white/60 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span>{label}</span>
      </div>
      <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function InputRow({ icon: Icon, label, value }: { icon: typeof Mountain; label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-white/60 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-1 leading-5">{value}</p>
    </div>
  );
}

function RiskMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[0.8rem] border border-white/60 bg-white/70 px-2 py-1.5 text-center dark:border-white/10 dark:bg-slate-900/70">
      <div className="text-[10px] uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
