import { Compass, Mountain, Route, Snowflake, TriangleAlert, Wind } from "lucide-react";
import { SherpAIGuidePanel } from "@/components/sherpai-guide-panel";
import { ElevationDangerBar } from "@/components/elevation-danger-bar";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/states";
import { buildTerrainGuide } from "@/lib/sherpai";
import { formatElevation } from "@/lib/utils";
import type { ForecastZone, TerrainCellDetails } from "@/types/terrain";

export function TerrainDrawer({ cell, zone, compact = false, onClose }: { cell?: TerrainCellDetails; zone?: ForecastZone; compact?: boolean; onClose?: () => void }) {
  if (!cell) {
    return <EmptyState title="Select a terrain cell" description="Tap a terrain hex to inspect localized hazard character, score factors, and route implications." compact={compact} />;
  }

  const realOnlyMode = process.env.NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA !== "0";
  const guide = zone && !realOnlyMode ? buildTerrainGuide(cell, zone) : undefined;

  return (
    <div className="sherpai-scroll h-full min-h-0 overflow-y-auto overscroll-contain border-l border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
      <Card className="min-h-full overflow-visible rounded-none border-0 bg-transparent shadow-none">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">Terrain guide</div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              Terrain Cell {cell.id}
              <StatusBadge status={cell.dangerRating} />
            </h3>
            <p className="text-xs text-muted-foreground">{cell.elevationBand} · {cell.elevationFt.toLocaleString()} ft · score {cell.score.toFixed(2)}</p>
          </div>
          {onClose ? <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">✕</button> : null}
        </div>
        <CardContent className="space-y-4 p-4 pb-10 text-sm">
          {guide ? <SherpAIGuidePanel guide={guide} /> : null}

          <div className="rounded-[1rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/70">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Supporting Terrain Evidence</div>

          <div className="rounded-[1rem] border border-white/60 bg-slate-50/85 p-4 dark:border-white/10 dark:bg-slate-900/75">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Terrain calculation stack</div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
              <p><span className="font-semibold text-foreground">Zone baseline:</span> {zone?.danger.overall ?? cell.dangerRating} danger with {zone?.recentSnowfallIn ?? 0} in new snow.</p>
              <p><span className="font-semibold text-foreground">Terrain geometry:</span> {cell.slopeAngleBand} on {cell.aspect} aspect at {cell.elevationFt.toLocaleString()} ft.</p>
              <p><span className="font-semibold text-foreground">Environmental loading:</span> {cell.loadingExposure} with terrain-trap condition {cell.terrainTrapProximity}.</p>
              <p><span className="font-semibold text-foreground">Snowpack field:</span> {cell.snowDepthIn} in total depth, {cell.snowfall24hIn} in / 24h, snowpack score {cell.snowpackScore.toFixed(2)}.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={Mountain} label="Slope Angle" value={cell.slopeAngleBand} />
            <InfoRow icon={Compass} label="Aspect" value={cell.aspect} />
            <InfoRow icon={Mountain} label="Elevation" value={formatElevation(cell.elevationFt)} />
            <InfoRow icon={Wind} label="Loading" value={cell.loadingExposure} />
            <InfoRow icon={Snowflake} label="Snow Depth" value={`${cell.snowDepthIn} in`} />
            <InfoRow icon={Snowflake} label="New Snow" value={`${cell.snowfall24hIn} in / 24h`} />
          </div>

          <div className="space-y-2 rounded-md bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <TriangleAlert className="h-3.5 w-3.5 text-danger-considerable" />
              Terrain Trap Proximity: <span className="capitalize">{cell.terrainTrapProximity}</span>
            </div>
            <p className="text-xs text-muted-foreground">{cell.cautionSummary}</p>
          </div>

          <div className="space-y-1 rounded-md border p-3">
            <div className="text-xs font-semibold">Relative Risk</div>
            <p className="text-xs text-muted-foreground">{cell.relativeRiskExplanation}</p>
          </div>

          </div>

          <div className="space-y-3 rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent Evidence Trail</div>
            {cell.scoreBreakdown.map((factor) => (
              <div key={factor.factor} className="rounded-md bg-muted/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold">{factor.factor}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{factor.contribution.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{factor.summary}</p>
              </div>
            ))}
          </div>

          {zone ? (
            <div className="space-y-3 border-t pt-4">
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zone Elevation Danger</h4>
                <ElevationDangerBar above={zone.danger.aboveTreeline} near={zone.danger.nearTreeline} below={zone.danger.belowTreeline} />
              </div>
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Problems</h4>
                <div className="space-y-2">
                  {zone.avalancheProblems.map((problem) => (
                    <div key={problem.id} className="rounded-md bg-muted/50 p-2.5 text-xs">
                      <div className="font-semibold">{problem.type}</div>
                      <div className="text-muted-foreground">{problem.likelihood} · {problem.size} · {problem.elevation}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {!compact ? (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Route className="h-4 w-4 text-primary" /> Route Planning
              </div>
              {cell.routeSegments.length ? (
                cell.routeSegments.map((segment) => (
                  <div key={segment.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{segment.name}</div>
                      <StatusBadge status={segment.exposureRating} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{segment.notes}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  No verified route segments are currently published for this terrain cell.
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mountain; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xs font-medium">{value}</p>
      </div>
    </div>
  );
}
