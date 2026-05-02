"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CloudSnow, Layers, MapPin, Thermometer, Wind } from "lucide-react";
import { useAllTerrainHexes } from "@/hooks/use-all-terrain-hexes";
import { useCurrentForecast } from "@/hooks/use-current-forecast";
import { useRecentObservations } from "@/hooks/use-recent-observations";
import { useSourceStatus } from "@/hooks/use-source-status";
import { useTerrainCell } from "@/hooks/use-terrain-cell";
import { useWeatherStations } from "@/hooks/use-weather-stations";
import { MapCanvas } from "@/components/map-canvas";

const EMPTY_ZONES: never[] = [];
const EMPTY_CELLS: never[] = [];
const EMPTY_STATIONS: never[] = [];
const EMPTY_OBSERVATIONS: never[] = [];
import { LayerSidebar } from "@/components/layer-sidebar";
import { TerrainDrawer } from "@/components/terrain-drawer";
import { LoadingState, ErrorState } from "@/components/states";
import { WeatherStationMarkers } from "@/components/weather-station-markers";
import { Button } from "@/components/ui/button";
import { useMapStore } from "@/lib/store/use-map-store";
import { DANGER_META } from "@/lib/constants";
import { buildZoneRiskSummaries } from "@/lib/zone-risk";
import type { OverlayMetric, SourceStatusLayer } from "@/types/terrain";


function sourceTone(mode: string) {
  if (mode === "official-imported" || mode === "dem-derived" || mode === "uac-live") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (mode === "missing") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  return "border-amber-200 bg-amber-50 text-amber-900";
}


function SourceBadge({ status }: { status: SourceStatusLayer }) {
  return (
    <div className={`rounded-md border px-2.5 py-1.5 ${sourceTone(status.mode)}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em]">{status.label}</div>
    </div>
  );
}

export function MapShell() {
  const [layoutMode, setLayoutMode] = useState<"presentation" | "workspace">("presentation");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [zoneFocusEnabled, setZoneFocusEnabled] = useState(false);
  const forecastQuery = useCurrentForecast();
  const sourceStatusQuery = useSourceStatus();
  const weatherQuery = useWeatherStations();
  const observationsQuery = useRecentObservations();
  const { selectedZoneId, setZone, selectedCellId, setCell, viewMode, setViewMode, layers, toggleLayer } = useMapStore();
  const terrainQuery = useAllTerrainHexes();
  const selectedCellQuery = useTerrainCell(selectedCellId);

  const zones = forecastQuery.data?.zones ?? EMPTY_ZONES;
  const terrainCells = terrainQuery.data ?? EMPTY_CELLS;
  const weatherStations = weatherQuery.data ?? EMPTY_STATIONS;
  const recentObservations = observationsQuery.data ?? EMPTY_OBSERVATIONS;
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0];
  const routeSegments = selectedCellQuery.data?.routeSegments ?? [];
  const stations = weatherStations.filter((station) => station.zoneId === selectedZoneId);
  const observations = recentObservations.filter((observation) => observation.zoneId === selectedZoneId);

  const selectedZoneCells = useMemo(
    () => terrainCells.filter((cell) => cell.zoneId === selectedZoneId),
    [selectedZoneId, terrainCells],
  );
  const visibleCells = useMemo(
    () => (zoneFocusEnabled ? selectedZoneCells : terrainCells),
    [selectedZoneCells, terrainCells, zoneFocusEnabled],
  );
  const zoneRiskSummaries = useMemo(() => buildZoneRiskSummaries(terrainCells), [terrainCells]);
  const selectedZoneRisk = selectedZone ? zoneRiskSummaries[selectedZone.id] : undefined;

  function handleSelectZone(zoneId: string) {
    setZone(zoneId);
    setCell(undefined);
    setZoneFocusEnabled(true);
  }

  function handleShowAllZones() {
    setCell(undefined);
    setZoneFocusEnabled(false);
  }

  function handleSelectCell(cellId?: string) {
    if (!cellId) {
      setCell(undefined);
      return;
    }
    const nextCell = visibleCells.find((cell) => cell.id === cellId);
    if (nextCell && nextCell.zoneId !== selectedZoneId) {
      setZone(nextCell.zoneId);
    }
    setZoneFocusEnabled(true);
    setCell(cellId);
  }

  const activeOverlay: OverlayMetric = useMemo(() => {
    if (layers.slopeAngle) return "slope";
    if (layers.aspect) return "aspect";
    if (layers.elevationBands) return "elevation";
    if (layers.snowpackDepth) return "snowpack";
    if (layers.stormSnow) return "storm";
    if (layers.windLoading) return "wind";
    if (layers.terrainTraps) return "traps";
    return "danger";
  }, [layers.aspect, layers.elevationBands, layers.slopeAngle, layers.snowpackDepth, layers.stormSnow, layers.terrainTraps, layers.windLoading]);

  if (forecastQuery.isLoading || weatherQuery.isLoading || observationsQuery.isLoading || terrainQuery.isLoading || !selectedZone) {
    return (
      <div className="container py-10">
        <LoadingState title="Building the Wasatch workspace" description="Loading zones, terrain cells, weather stations, and recent observations." />
      </div>
    );
  }

  if (forecastQuery.isError || weatherQuery.isError || observationsQuery.isError || terrainQuery.isError) {
    return (
      <div className="container py-10">
        <ErrorState title="Unable to load the terrain workspace" description="Review the frontend API base URL or the built-in Next.js API routes to restore live responses." />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white/26 dark:bg-slate-950/35 xl:flex xl:h-[calc(100vh-3.5rem)] xl:items-stretch xl:overflow-hidden">
      <div className={`absolute inset-y-0 left-0 z-30 w-[320px] max-w-[85vw] border-r border-white/60 transition-transform duration-300 xl:static xl:min-h-[calc(100vh-3.5rem)] xl:self-stretch xl:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"}`}>
          <LayerSidebar
            zones={zones}
            selectedZone={selectedZone}
            selectedZoneId={selectedZoneId}
            terrainCellCount={selectedZoneCells.length}
            frameCellCount={terrainCells.length}
            stationsCount={stations.length}
            observationCount={observations.length}
            sourceStatus={sourceStatusQuery.data}
            activeOverlay={activeOverlay}
            zoneRiskSummaries={zoneRiskSummaries}
            onSelectZone={handleSelectZone}
            layers={layers}
            onToggleLayer={toggleLayer}
            viewMode={viewMode}
            onViewMode={setViewMode}
          />
      </div>

      <button
        onClick={() => setSidebarOpen((value) => !value)}
        className="absolute left-0 top-1/2 z-40 rounded-r-xl border border-white/70 bg-white/80 p-1.5 shadow-lg backdrop-blur-xl transition hover:bg-white xl:hidden"
        style={{ left: sidebarOpen ? "320px" : "0" }}
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {sidebarOpen ? <button className="absolute inset-0 z-20 bg-slate-950/20 xl:hidden" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden xl:min-h-0 xl:pl-0">
        <div className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-3 overflow-x-auto border-b border-white/60 bg-white/72 px-4 py-3 text-xs backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/72 xl:pl-6">
          <div className="flex items-center gap-2 font-semibold shrink-0">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {selectedZone.name}
            <span className={`rounded-md px-2 py-0.5 ${DANGER_META[selectedZoneRisk?.overall ?? selectedZone.danger.overall].classes}`}>{DANGER_META[selectedZoneRisk?.overall ?? selectedZone.danger.overall].label}</span>
          </div>
          <div className="h-4 w-px bg-border shrink-0" />
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">{selectedZoneCells.length} modeled hexes</div>
          <div className="flex items-center gap-1 text-muted-foreground shrink-0"><CloudSnow className="h-3 w-3" />Obs {selectedZone.recentSnowfallIn} in / 24h</div>
          {selectedZone.snowForecast?.next24hIn !== null && selectedZone.snowForecast?.next24hIn !== undefined ? <div className="flex items-center gap-1 text-muted-foreground shrink-0"><CloudSnow className="h-3 w-3" />Fcst {selectedZone.snowForecast.next24hIn} in / 24h</div> : null}
          <div className="flex items-center gap-1 text-muted-foreground shrink-0"><Wind className="h-3 w-3" />{selectedZone.windDirection} {selectedZone.windSpeedMph} mph</div>
          <div className="flex items-center gap-1 text-muted-foreground shrink-0"><Thermometer className="h-3 w-3" />{selectedZone.temperatureF}°F</div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {sourceStatusQuery.data ? (
              <div className="hidden items-center gap-2 lg:flex">
                <SourceBadge status={sourceStatusQuery.data.zoneBoundaries} />
                <SourceBadge status={sourceStatusQuery.data.terrainCells} />
                <SourceBadge status={sourceStatusQuery.data.forecastAdvisories} />
              </div>
            ) : null}
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground"><Layers className="h-3 w-3" />{activeOverlay}</div>
            <Button variant={layoutMode === "presentation" ? "default" : "outline"} size="sm" onClick={() => setLayoutMode("presentation")}>Presentation</Button>
            <Button variant={layoutMode === "workspace" ? "default" : "outline"} size="sm" onClick={() => setLayoutMode("workspace")}>Workspace</Button>
          </div>
        </div>

        <div className={`grid flex-1 gap-4 p-4 xl:min-h-0 xl:items-stretch xl:p-5 ${layoutMode === "workspace" ? "xl:grid-cols-[minmax(0,1fr),380px]" : "xl:grid-cols-[minmax(0,1fr),360px]"}`}>
          <div className="flex min-w-0 flex-col gap-4 xl:min-h-0">
            <div className={layoutMode === "workspace" ? "h-[min(68vh,50rem)] sm:h-[40rem] xl:min-h-0 xl:flex-1" : "h-[min(72vh,54rem)] sm:h-[42rem] xl:h-full xl:min-h-0"}>
            <MapCanvas
              zones={zones}
              selectedZone={selectedZone}
              cells={visibleCells}
              zoneRiskSummaries={zoneRiskSummaries}
              stations={stations}
              observations={observations}
              routeSegments={routeSegments}
              selectedCellId={selectedCellId}
              onSelectCell={handleSelectCell}
              onSelectZone={handleSelectZone}
              onShowAllZones={handleShowAllZones}
              layers={layers}
              viewMode={viewMode}
              activeOverlay={activeOverlay}
              focusSelectedZone={zoneFocusEnabled}
              showPopup={layoutMode === "presentation"}
            />
            </div>
            {layoutMode === "workspace" ? <div className="xl:max-h-[220px] xl:overflow-y-auto"><WeatherStationMarkers stations={stations.slice(0, 4)} /></div> : null}
          </div>
          <div className={layoutMode === "workspace" ? "min-h-0 xl:self-stretch xl:overflow-hidden" : "min-h-0 xl:h-full xl:overflow-hidden"}>
            <TerrainDrawer cell={selectedCellQuery.data} zone={selectedZone} compact={layoutMode === "presentation"} onClose={() => setCell(undefined)} />
          </div>
        </div>
      </div>
    </div>
  );
}
