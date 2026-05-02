"use client";

import { useMemo, useState } from "react";
import { CloudSnow, MapPin, Thermometer, Wind } from "lucide-react";

const EMPTY_ZONES: never[] = [];
const EMPTY_CELLS: never[] = [];
const EMPTY_STATIONS: never[] = [];
const EMPTY_OBSERVATIONS: never[] = [];
import { MapCanvas } from "@/components/map-canvas";
import { ObservationList } from "@/components/observation-list";
import { SherpAIObservationWorkbench } from "@/components/sherpai-observation-workbench";
import { LoadingState, ErrorState } from "@/components/states";
import { useAllTerrainHexes } from "@/hooks/use-all-terrain-hexes";
import { useCurrentForecast } from "@/hooks/use-current-forecast";
import { useRecentObservations } from "@/hooks/use-recent-observations";
import { useWeatherStations } from "@/hooks/use-weather-stations";
import { ZoneList } from "@/components/zone-list";
import { DEFAULT_ZONE_ID } from "@/lib/constants";
import { buildZoneRiskSummaries } from "@/lib/zone-risk";

export default function ObservationsPage() {
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONE_ID);
  const [selectedCellId, setSelectedCellId] = useState<string>();
  const [zoneFocusEnabled, setZoneFocusEnabled] = useState(true);
  const zonesQuery = useCurrentForecast();
  const terrainQuery = useAllTerrainHexes();
  const weatherQuery = useWeatherStations();
  const observationsQuery = useRecentObservations();
  const zones = zonesQuery.data?.zones ?? EMPTY_ZONES;
  const terrainCells = terrainQuery.data ?? EMPTY_CELLS;
  const weatherStations = weatherQuery.data ?? EMPTY_STATIONS;
  const observations = observationsQuery.data ?? EMPTY_OBSERVATIONS;
  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) ?? zones[0], [selectedZoneId, zones]);
  const selectedZoneCells = useMemo(() => terrainCells.filter((cell) => cell.zoneId === selectedZone?.id), [selectedZone?.id, terrainCells]);
  const stations = useMemo(() => weatherStations.filter((station) => station.zoneId === selectedZone?.id), [selectedZone?.id, weatherStations]);
  const zoneRiskSummaries = useMemo(() => buildZoneRiskSummaries(terrainCells), [terrainCells]);

  if (zonesQuery.isLoading || terrainQuery.isLoading || weatherQuery.isLoading || observationsQuery.isLoading || !selectedZone) {
    return <div className="container py-10"><LoadingState title="Loading observation feed" description="Pulling avalanche reports, snowpack notes, and field tool placeholders." /></div>;
  }
  if (zonesQuery.isError || terrainQuery.isError || weatherQuery.isError || observationsQuery.isError) {
    return <div className="container py-10"><ErrorState title="Observation feed unavailable" description="The observation index could not be loaded." /></div>;
  }

  const zoneObservations = observations.filter((observation) => observation.zoneId === selectedZone.id);

  function handleSelectZone(zoneId: string) {
    setSelectedZoneId(zoneId);
    setSelectedCellId(undefined);
    setZoneFocusEnabled(true);
  }

  function handleShowAllZones() {
    setSelectedCellId(undefined);
    setZoneFocusEnabled(false);
  }

  function handleSelectCell(cellId?: string) {
    setSelectedCellId(cellId);
    if (cellId) {
      setZoneFocusEnabled(true);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white/26 dark:bg-slate-950/35">
      <div className="border-b border-white/60 bg-white/72 px-4 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/72 xl:px-6">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 font-semibold shrink-0">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {selectedZone.name}
          </div>
          <div className="h-4 w-px bg-border shrink-0" />
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">{selectedZoneCells.length} terrain cells in view</div>
          <div className="flex items-center gap-1 text-muted-foreground shrink-0"><CloudSnow className="h-3 w-3" />{selectedZone.recentSnowfallIn} in / 24h</div>
          <div className="flex items-center gap-1 text-muted-foreground shrink-0"><Wind className="h-3 w-3" />{selectedZone.windDirection} {selectedZone.windSpeedMph} mph</div>
          <div className="flex items-center gap-1 text-muted-foreground shrink-0"><Thermometer className="h-3 w-3" />{selectedZone.temperatureF}°F</div>
        </div>
      </div>

      <div className="grid gap-6 p-4 xl:p-6">
        <div className="h-[min(72vh,56rem)] sm:h-[44rem] xl:h-[min(78vh,62rem)]">
          <MapCanvas
            zones={zones}
            selectedZone={selectedZone}
            cells={zoneFocusEnabled ? selectedZoneCells : terrainCells}
            zoneRiskSummaries={zoneRiskSummaries}
            stations={stations}
            observations={zoneObservations}
            routeSegments={[]}
            selectedCellId={selectedCellId}
            onSelectCell={handleSelectCell}
            onSelectZone={handleSelectZone}
            onShowAllZones={handleShowAllZones}
            layers={{
              zones: true,
              terrainHazardHex: true,
              slopeAngle: false,
              aspect: false,
              elevationBands: false,
              snowpackDepth: false,
              windLoading: false,
              terrainTraps: false,
              weatherStations: true,
              observations: true,
              routeSegments: false,
            }}
            viewMode="terrain-intel"
            activeOverlay="danger"
            focusSelectedZone={zoneFocusEnabled}
            showPopup={false}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)] xl:items-stretch">
          <div className="h-full">
            <div className="h-full rounded-[1.4rem] border border-white/70 bg-white/84 p-4 shadow-[0_24px_54px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/72">
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Observation zones</div>
              <ZoneList zones={zones} selectedZoneId={selectedZone.id} onSelect={handleSelectZone} zoneRiskSummaries={zoneRiskSummaries} />
            </div>
          </div>
          <div className="grid gap-6">
            <SherpAIObservationWorkbench zone={selectedZone} observations={zoneObservations} />
            <ObservationList observations={zoneObservations} />
          </div>
        </div>
      </div>
    </div>
  );
}
