"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import type { PickingInfo } from "@deck.gl/core";
import { MapboxOverlay } from "@deck.gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapView, { Layer, Marker, NavigationControl, Popup, ScaleControl, Source, useControl, type MapMouseEvent, type MapRef } from "react-map-gl/mapbox";
import { AlertTriangle, Route, Sparkles } from "lucide-react";
import { MapLegendItems, type MapLegendItem, type MapLegendScale } from "@/components/map-legend";
import { DANGER_META, WASATCH_VIEW_STATE } from "@/lib/constants";
import { EmptyState } from "@/components/states";
import type { ZoneRiskSummary } from "@/lib/zone-risk";
import type { DangerRating, FieldObservation, ForecastZone, OverlayMetric, RouteSegment, TerrainHexCell, WeatherStation } from "@/types/terrain";

function DeckOverlay(props: ConstructorParameters<typeof MapboxOverlay>[0]) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const zoneFill = {
  id: "zone-fill",
  type: "fill",
  paint: {
    "fill-color": "#ffffff",
    "fill-opacity": 0.05,
  },
} as const;

const zoneOutline = {
  id: "zone-outline",
  type: "line",
  paint: {
    "line-color": "rgba(18, 24, 38, 0.46)",
    "line-width": 1.2,
    "line-dasharray": [4, 4] as number[],
  },
} as const;

const selectedZoneOutline = {
  id: "selected-zone-outline",
  type: "line",
  paint: {
    "line-color": "rgba(21, 24, 31, 0.78)",
    "line-width": 2.2,
    "line-dasharray": [5, 4] as number[],
  },
} as const;

const hillshadeLayer = {
  id: "terrain-hillshade",
  type: "hillshade",
  paint: {
    "hillshade-shadow-color": "#9ba8b6",
    "hillshade-highlight-color": "#f8fafc",
    "hillshade-accent-color": "#cfd8e3",
    "hillshade-exaggeration": 0.14,
  },
} as const;

const routeLine = {
  id: "route-segments",
  type: "line",
  paint: {
    "line-color": "#f97316",
    "line-width": 3,
  },
} as const;

type OverlayColor = [number, number, number, number];

const LEGEND_COPY: Record<DangerRating, string> = {
  low: "Generally safe",
  moderate: "Heightened attention",
  considerable: "Dangerous pockets",
  high: "Very dangerous",
  extreme: "Avoid / no go",
};

const OVERLAY_TITLES: Record<OverlayMetric, string> = {
  danger: "AvyTS Terrain Hex Scale",
  slope: "Slope Weighted Signal",
  aspect: "Aspect Weighted Signal",
  elevation: "Elevation Weighted Signal",
  snowpack: "Snowpack Weighted Signal",
  storm: "24h Snowfall Forecast",
  wind: "Wind Weighted Signal",
  traps: "Terrain Trap Weighted Signal",
};

const DANGER_ORDER: DangerRating[] = ["low", "moderate", "considerable", "high", "extreme"];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, min: number, max: number) {
  if (max <= min) {
    return 0;
  }
  return clamp((value - min) / (max - min));
}

function dangerColor(rating: TerrainHexCell["dangerRating"]): OverlayColor {
  return DANGER_META[rating].fill;
}

function slopeFactor(slope: number) {
  if (slope >= 40) return 1.55;
  if (slope >= 35) return 1.2;
  if (slope >= 30) return 0.85;
  return 0.4;
}

function elevationFactor(elevationFt: number) {
  if (elevationFt >= 9800) return 1.1;
  if (elevationFt >= 8600) return 0.72;
  return 0.32;
}

function aspectFactor(aspect: string) {
  return ["NW", "N", "NE", "E"].includes(aspect) ? 0.45 : 0.18;
}

function loadingFactor(loadingExposure: string) {
  const normalized = loadingExposure.toLowerCase();
  if (normalized.includes("heavy") || normalized.includes("lee")) return 0.78;
  if (normalized.includes("cross")) return 0.62;
  if (normalized.includes("moderate")) return 0.48;
  return 0.22;
}

function trapFactor(trapExposure: string) {
  const normalized = trapExposure.toLowerCase();
  if (normalized.includes("high")) return 0.78;
  if (normalized.includes("moderate")) return 0.52;
  if (normalized.includes("low")) return 0.28;
  return 0.08;
}

function stormForecastSignal(zone: ForecastZone | undefined, cell: TerrainHexCell) {
  const snowForecast = zone?.snowForecast;
  if (!snowForecast) {
    return normalize(cell.snowfall24hIn, 0, 12);
  }

  const next24hSignal = clamp((snowForecast.next24hIn ?? 0) / 12);
  const next72hTailSignal = clamp(Math.max((snowForecast.next72hIn ?? 0) - (snowForecast.next24hIn ?? 0), 0) / 18);
  const snowLevelSignal = snowForecast.snowLevelFt === null
    ? 0.55
    : clamp((cell.elevationFt - snowForecast.snowLevelFt + 1200) / 2400);
  const windSignal = clamp(cell.windExposureIndex);

  return clamp(next24hSignal * 0.5 + next72hTailSignal * 0.1 + snowLevelSignal * 0.25 + windSignal * 0.15);
}

function metricWeight(metric: OverlayMetric, cell: TerrainHexCell, zone: ForecastZone | undefined) {
  switch (metric) {
    case "danger":
      return normalize(cell.score, 0.55, 1.65);
    case "slope":
      return normalize(slopeFactor(slopeBandMinimum(cell.slopeAngleBand)), 0.4, 1.55);
    case "aspect":
      return normalize(aspectFactor(cell.aspect), 0.18, 0.45);
    case "elevation":
      return normalize(elevationFactor(cell.elevationFt), 0.32, 1.1);
    case "wind": {
      const textSignal = normalize(loadingFactor(cell.loadingExposure), 0.22, 0.78);
      return clamp(textSignal * 0.6 + clamp(cell.windExposureIndex) * 0.4);
    }
    case "traps":
      return normalize(trapFactor(cell.terrainTrapProximity), 0.08, 0.78);
    case "snowpack": {
      const depthSignal = clamp(cell.snowDepthIn / 160);
      const newSnowSignal = clamp(cell.snowfall24hIn / 18);
      const scoreSignal = clamp(cell.snowpackScore / 3.2);
      return clamp(depthSignal * 0.4 + newSnowSignal * 0.25 + scoreSignal * 0.35);
    }
    case "storm":
      return stormForecastSignal(zone, cell);
    default:
      return 0;
  }
}

function ratingFromSignal(signal: number): DangerRating {
  if (signal >= 0.8) return "extreme";
  if (signal >= 0.62) return "high";
  if (signal >= 0.44) return "considerable";
  if (signal >= 0.24) return "moderate";
  return "low";
}

function buildZoneFillLayer(fillOpacity: number) {
  return {
    ...zoneFill,
    paint: {
      ...zoneFill.paint,
      "fill-opacity": fillOpacity,
    },
  } as const;
}

function slopeBandMinimum(slopeAngleBand: string) {
  const match = slopeAngleBand.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function polygonCentroid(coordinates: number[][][]) {
  const ring = coordinates[0] ?? [];
  if (!ring.length) return [0, 0] as [number, number];
  const total = ring.reduce(
    (accumulator, [lng, lat]) => {
      accumulator.lng += lng;
      accumulator.lat += lat;
      return accumulator;
    },
    { lng: 0, lat: 0 },
  );
  return [total.lng / ring.length, total.lat / ring.length] as [number, number];
}

function zoneLabelPosition(zoneId: string, cells: TerrainHexCell[], fallback: [number, number]) {
  const zoneCells = cells.filter((cell) => cell.zoneId === zoneId);
  if (!zoneCells.length) {
    return fallback;
  }

  const totals = zoneCells.reduce(
    (accumulator, cell) => {
      accumulator.lng += cell.centroid[0];
      accumulator.lat += cell.centroid[1];
      return accumulator;
    },
    { lng: 0, lat: 0 },
  );

  return [totals.lng / zoneCells.length, totals.lat / zoneCells.length] as [number, number];
}

function colorToStyle(color: [number, number, number, number], borderColor = "rgba(15, 23, 42, 0.18)") {
  return {
    backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`,
    borderColor,
  };
}

function buildDangerLegendItems(): MapLegendItem[] {
  return DANGER_ORDER.map((rating) => ({
    key: rating,
    label: DANGER_META[rating].label,
    description: LEGEND_COPY[rating],
    swatchStyle: colorToStyle(dangerColor(rating), rating === "extreme" ? "rgba(255,255,255,0.18)" : "rgba(15, 23, 42, 0.18)"),
  }));
}

function scaleColors(ratings: DangerRating[]) {
  return ratings.map((rating) => `rgba(${dangerColor(rating)[0]}, ${dangerColor(rating)[1]}, ${dangerColor(rating)[2]}, ${dangerColor(rating)[3] / 255})`);
}

function createLegendItem(key: string, label: string, description: string, rating: DangerRating): MapLegendItem {
  return {
    key,
    label,
    description,
    swatchStyle: colorToStyle(dangerColor(rating), rating === "extreme" ? "rgba(255,255,255,0.18)" : "rgba(15, 23, 42, 0.18)"),
  };
}

function createScale(label: string, minLabel: string, maxLabel: string, ratings: DangerRating[], mode: MapLegendScale["mode"] = "indexed"): MapLegendScale {
  return {
    label,
    minLabel,
    maxLabel,
    colors: scaleColors(ratings),
    mode,
  };
}

function buildLegendDescriptor(metric: OverlayMetric): { title: string; subtitle: string; items: MapLegendItem[]; scale?: MapLegendScale } {
  switch (metric) {
    case "danger":
      return {
        title: OVERLAY_TITLES.danger,
        subtitle: "per hex cell avalanche rating",
        items: buildDangerLegendItems(),
      };
    case "slope":
      return {
        title: "Slope Angle Key",
        subtitle: "per hex cell slope band",
        scale: createScale("Slope signal index", "Lower-angle", "Steeper start zones", DANGER_ORDER),
        items: [
          createLegendItem("lt30", "<=29 deg", "Lower-angle terrain", "low"),
          createLegendItem("30-34", "30-34 deg", "Avalanche-supporting threshold", "moderate"),
          createLegendItem("35-39", "35-39 deg", "Prime slab start zone band", "considerable"),
          createLegendItem("40-44", "40-44 deg", "Steep avalanche start zones", "high"),
          createLegendItem("45plus", "45+ deg", "Extreme steepness / limited anchors", "extreme"),
        ],
      };
    case "aspect":
      return {
        title: "Aspect Exposure Key",
        subtitle: "per hex cell aspect weighting",
        scale: createScale("Aspect tendency", "Solar / warmer", "Shaded / loaded", ["low", "moderate", "high"], "spectrum"),
        items: [
          createLegendItem("solar", "Solar", "S through W aspects with lower cold-loading signal", "low"),
          createLegendItem("transition", "Transition", "Mixed aspects where loading can still build", "moderate"),
          createLegendItem("cold", "Cold-loaded", "E through NW aspects favored by colder snow and loading", "high"),
        ],
      };
    case "elevation":
      return {
        title: "Elevation Band Key",
        subtitle: "per hex cell elevation weighting",
        scale: createScale("Elevation signal", "Lower terrain", "Upper alpine", ["low", "moderate", "high"], "indexed"),
        items: [
          createLegendItem("lower", "Lower", "Below roughly 8,600 ft", "low"),
          createLegendItem("near", "Near TL", "Near-treeline terrain around 8,600-9,800 ft", "moderate"),
          createLegendItem("upper", "Upper", "Above-treeline alpine terrain", "high"),
        ],
      };
    case "snowpack":
      return {
        title: "Snowpack Key",
        subtitle: "per hex cell snowpack signal",
        scale: createScale("Snowpack index", "Thinner / weaker", "Deeper / more reactive", ["low", "moderate", "considerable", "high"], "spectrum"),
        items: [
          createLegendItem("thin", "Thin", "Shallow snowpack or limited recent loading", "low"),
          createLegendItem("building", "Building", "Modest depth with new snow influence", "moderate"),
          createLegendItem("reactive", "Reactive", "Deeper slab structure and stacking stress", "considerable"),
          createLegendItem("loaded", "Loaded", "Deep or recently loaded snowpack pockets", "high"),
        ],
      };
    case "storm":
      return {
        title: OVERLAY_TITLES.storm,
        subtitle: "per hex cell storm signal",
        scale: createScale("Storm index", "Minimal", "Heavy", ["low", "moderate", "considerable", "high"], "spectrum"),
        items: [
          createLegendItem("trace", "Trace", "Little storm input into the cell", "low"),
          createLegendItem("light", "Light", "Light accumulation or marginal snow level", "moderate"),
          createLegendItem("moderate", "Moderate", "Useful snow at elevation", "considerable"),
          createLegendItem("heavy", "Heavy", "High-elevation or wind-boosted storm setup", "high"),
        ],
      };
    case "wind":
      return {
        title: "Wind Loading Key",
        subtitle: "per hex cell wind-loading signal",
        scale: createScale("Wind loading index", "Neutral", "Lee-loaded", ["low", "moderate", "considerable", "high"], "spectrum"),
        items: [
          createLegendItem("open", "Open", "Neutral exposure with limited drift formation", "low"),
          createLegendItem("cross", "Cross", "Cross-loading begins to form drifts", "moderate"),
          createLegendItem("lee", "Lee", "Persistent lee loading on start zones", "considerable"),
          createLegendItem("heavy-lee", "Heavy lee", "Strong ridge-top loading pockets", "high"),
        ],
      };
    case "traps":
      return {
        title: "Terrain Trap Key",
        subtitle: "per hex cell consequence signal",
        scale: createScale("Consequence index", "Open runout", "Trap-dense", ["low", "moderate", "considerable", "high"], "indexed"),
        items: [
          createLegendItem("open", "Open", "Broad runouts with lower trap consequence", "low"),
          createLegendItem("constrained", "Constrained", "Benches, creek bends, or minor terrain traps", "moderate"),
          createLegendItem("confined", "Confined", "Gullies, trees, and road cuts increase consequence", "considerable"),
          createLegendItem("severe", "Severe", "Dense terrain traps with high burial or impact consequence", "high"),
        ],
      };
    default:
      return {
        title: OVERLAY_TITLES.danger,
        subtitle: "per hex cell avalanche rating",
        items: buildDangerLegendItems(),
      };
  }
}

function overlayLegendTitle(metric: OverlayMetric) {
  return OVERLAY_TITLES[metric];
}

function overlayMetricRating(metric: OverlayMetric, cell: TerrainHexCell, zone: ForecastZone | undefined): DangerRating {
  if (metric === "danger") {
    return cell.dangerRating;
  }

  return ratingFromSignal(metricWeight(metric, cell, zone));
}

function overlayMetricColor(metric: OverlayMetric, cell: TerrainHexCell, zone: ForecastZone | undefined): [number, number, number, number] {
  return dangerColor(overlayMetricRating(metric, cell, zone));
}

function hexOutlineColor(isFocusedZone: boolean): [number, number, number, number] {
  if (!isFocusedZone) {
    return [255, 255, 255, 24];
  }

  return [15, 23, 42, 72];
}

export function MapCanvas({ zones, selectedZone, cells, zoneRiskSummaries, stations, observations, routeSegments, selectedCellId, onSelectCell, onSelectZone, onShowAllZones, layers, viewMode, activeOverlay, focusSelectedZone = false, showPopup = true }: { zones: ForecastZone[]; selectedZone: ForecastZone; cells: TerrainHexCell[]; zoneRiskSummaries?: Record<string, ZoneRiskSummary>; stations: WeatherStation[]; observations: FieldObservation[]; routeSegments: RouteSegment[]; selectedCellId?: string; onSelectCell: (cellId?: string) => void; onSelectZone: (zoneId: string) => void; onShowAllZones: () => void; layers: Record<string, boolean>; viewMode: "regional" | "terrain-intel"; activeOverlay: OverlayMetric; focusSelectedZone?: boolean; showPopup?: boolean; }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const mapRef = useRef<MapRef>(null);
  const [currentZoom, setCurrentZoom] = useState(WASATCH_VIEW_STATE.zoom);
  const frameZoneLabel = useMemo(() => {
    return [...zones]
      .sort((first, second) => polygonCentroid(second.geometry.geometry.coordinates)[1] - polygonCentroid(first.geometry.geometry.coordinates)[1])
      .map((zone) => zone.name)
      .join(" · ");
  }, [zones]);

  const zoneCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: zones.map((zone) => zone.geometry),
    }),
    [zones],
  );

  const selectedZoneCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [selectedZone.geometry],
    }),
    [selectedZone],
  );

  const routeCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: routeSegments.map((segment) => segment.geometry),
    }),
    [routeSegments],
  );

  const zoneForecastRows = useMemo(
    () => zones.map((zone) => {
      const summary = zoneRiskSummaries?.[zone.id];
      const rating = summary?.overall ?? zone.danger.overall;
      const elevatedShare = summary ? Math.round(((summary.counts.considerable + summary.counts.high + summary.counts.extreme) / Math.max(summary.cellCount, 1)) * 100) : 0;
      return {
        id: zone.id,
        name: zone.name,
        rating,
        cellCount: summary?.cellCount ?? 0,
        elevatedShare,
      };
    }),
    [zoneRiskSummaries, zones],
  );
  const legend = useMemo(() => buildLegendDescriptor(activeOverlay), [activeOverlay]);
  const showOverviewForecast = layers.zones && currentZoom < 9.55;
  const showZoneMarkers = layers.zones && currentZoom < 9.55;
  const showHexOverlay = layers.terrainHazardHex && viewMode === "terrain-intel";
  const zonesById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const zoneFillLayer = useMemo(() => buildZoneFillLayer(showHexOverlay ? 0 : 0.04), [showHexOverlay]);
  const markerZones = useMemo(() => {
    if (!showZoneMarkers) {
      return [] as ForecastZone[];
    }
    if (showHexOverlay && focusSelectedZone) {
      return zones.filter((zone) => zone.id !== selectedZone.id);
    }
    if (showHexOverlay) {
      return [] as ForecastZone[];
    }
    return zones;
  }, [focusSelectedZone, selectedZone.id, showHexOverlay, showZoneMarkers, zones]);

  const deckLayers = useMemo(
    () => [
      new H3HexagonLayer<TerrainHexCell>({
        id: "terrain-hex-layer",
        data: showHexOverlay ? cells : [],
        pickable: true,
        filled: true,
        stroked: true,
        getHexagon: (cell) => cell.h3Index,
        getFillColor: (cell) => overlayMetricColor(activeOverlay, cell, zonesById.get(cell.zoneId)),
        getLineColor: (cell): [number, number, number, number] => {
          if (cell.id === selectedCellId) return [22, 28, 36, 245];
          return hexOutlineColor(focusSelectedZone && cell.zoneId === selectedZone.id);
        },
        lineWidthMinPixels: 0.12,
        lineWidthMaxPixels: 0.32,
        opacity: 1,
        onClick: (info: PickingInfo<TerrainHexCell>) => onSelectCell(info.object?.id),
      }),
    ],
    [activeOverlay, cells, focusSelectedZone, onSelectCell, selectedCellId, selectedZone.id, showHexOverlay, zonesById],
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const selectedCell = selectedCellId ? cells.find((cell) => cell.id === selectedCellId) : undefined;

    if (selectedCell) {
      map.easeTo({ center: selectedCell.centroid, zoom: Math.max(map.getZoom(), 9.7), duration: 700, essential: true });
      return;
    }

    if (!focusSelectedZone) {
      map.easeTo({ ...WASATCH_VIEW_STATE, duration: 800, essential: true });
      return;
    }

    const coordinates = selectedZone.geometry.geometry.coordinates[0];
    const bounds = coordinates.reduce(
      (acc, [longitude, latitude]) => {
        acc[0][0] = Math.min(acc[0][0], longitude);
        acc[0][1] = Math.min(acc[0][1], latitude);
        acc[1][0] = Math.max(acc[1][0], longitude);
        acc[1][1] = Math.max(acc[1][1], latitude);
        return acc;
      },
      [[Infinity, Infinity], [-Infinity, -Infinity]] as [[number, number], [number, number]],
    );
    map.fitBounds(bounds, { padding: { top: 72, right: 72, bottom: 72, left: 72 }, duration: 800, essential: true });
  }, [cells, focusSelectedZone, selectedCellId, selectedZone]);

  if (!token) {
    return (
      <div className="flex h-full min-h-[760px] items-center justify-center rounded-[1.75rem] border border-border bg-terrain-bg p-6">
        <EmptyState title="Mapbox token required for live basemap rendering" description="Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to use the live Wasatch basemap. Until then, the rest of the prototype and API-backed data remain fully functional." />
      </div>
    );
  }

  function handleZoneClick(event: MapMouseEvent) {
    const feature = event.features?.find((candidate) => candidate.layer?.id === "zone-fill" || candidate.layer?.id === "zone-outline" || candidate.layer?.id === "selected-zone-outline");
    const zoneId = typeof feature?.properties?.zoneId === "string" ? feature.properties.zoneId : undefined;
    if (zoneId) {
      onSelectZone(zoneId);
    }
  }

  return (
    <div className="relative h-full min-h-[640px] overflow-hidden rounded-[1.4rem] border border-white/60 shadow-[0_30px_75px_rgba(15,23,42,0.16)] xl:min-h-[760px]">
      <MapView
        ref={mapRef}
        mapLib={mapboxgl}
        initialViewState={WASATCH_VIEW_STATE}
        minZoom={7.8}
        maxZoom={11.5}
        reuseMaps
        dragRotate={false}
        mapboxAccessToken={token}
        pitchWithRotate={false}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactiveLayerIds={["zone-fill", "zone-outline", "selected-zone-outline"]}
        onClick={handleZoneClick}
        onMove={(event) => setCurrentZoom(event.viewState.zoom)}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" unit="imperial" maxWidth={120} />
        {!showHexOverlay ? (
          <Source id="terrain-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14}>
            <Layer {...hillshadeLayer} />
          </Source>
        ) : null}
        {layers.zones ? (
          <Source id="zones" type="geojson" data={zoneCollection}>
            <Layer {...zoneFillLayer} />
            <Layer {...zoneOutline} />
          </Source>
        ) : null}
        {layers.zones ? (
          <Source id="selected-zone" type="geojson" data={selectedZoneCollection}>
            <Layer {...selectedZoneOutline} />
          </Source>
        ) : null}
        {layers.routeSegments ? (
          <Source id="routes" type="geojson" data={routeCollection}>
            <Layer {...routeLine} />
          </Source>
        ) : null}
        {layers.weatherStations
          ? stations.map((station) => (
              <Marker key={station.id} longitude={station.geometry.geometry.coordinates[0]} latitude={station.geometry.geometry.coordinates[1]} anchor="bottom">
                <div className="rounded-full border border-white/70 bg-primary px-2 py-1 text-[10px] font-semibold text-white shadow-lg">WX</div>
              </Marker>
            ))
          : null}
        {layers.observations
          ? observations.map((observation) => (
              <Marker key={observation.id} longitude={observation.geometry.geometry.coordinates[0]} latitude={observation.geometry.geometry.coordinates[1]} anchor="bottom">
                <div className="rounded-full border border-white/80 bg-accent px-2 py-1 text-[10px] font-semibold text-white shadow-lg">OBS</div>
              </Marker>
            ))
          : null}
        {showZoneMarkers ? markerZones.map((zone) => {
          const zoneRisk = zoneRiskSummaries?.[zone.id];
          const rating = zoneRisk?.overall ?? zone.danger.overall;
          const [longitude, latitude] = zoneLabelPosition(zone.id, cells, polygonCentroid(zone.geometry.geometry.coordinates));
          return (
            <Marker key={`${zone.id}-summary`} longitude={longitude} latitude={latitude} anchor="center">
              <button
                type="button"
                onClick={() => onSelectZone(zone.id)}
                className={`rounded-[999px] border px-2.5 py-2 text-left shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition ${zone.id === selectedZone.id ? "border-slate-900/25 bg-white ring-2 ring-slate-900/10" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"}`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{zone.name}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${DANGER_META[rating].classes}`}>{DANGER_META[rating].label}</span>
                  {showOverviewForecast ? <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">{zoneRisk?.cellCount ?? 0} hex</span> : null}
                </div>
              </button>
            </Marker>
          );
        }) : null}
        {showPopup && selectedCellId ? (() => {
          const selectedCell = cells.find((cell) => cell.id === selectedCellId);
          return selectedCell ? (
            <Popup longitude={selectedCell.centroid[0]} latitude={selectedCell.centroid[1]} closeButton closeOnClick={false} onClose={() => onSelectCell(undefined)} anchor="top" offset={18} className="terrain-popup">
              <div className="p-3 sm:p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                  <Sparkles className="h-3.5 w-3.5" /> Terrain read
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  {selectedZone.name} terrain cell
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${DANGER_META[selectedCell.dangerRating].classes}`}>{DANGER_META[selectedCell.dangerRating].label}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{selectedCell.slopeAngleBand} · {selectedCell.aspect} · {selectedCell.elevationFt.toLocaleString()} ft · {selectedCell.snowDepthIn} in depth</div>
                <p className="mt-2 max-w-[220px] text-xs leading-5 text-slate-700 sm:max-w-[250px]">{selectedCell.operationalSummary}</p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Open the terrain details rail for the full evidence stack</p>
              </div>
            </Popup>
          ) : null;
        })() : null}
        <DeckOverlay layers={deckLayers} />
      </MapView>

      <div className="pointer-events-none absolute left-4 top-4 hidden max-w-[260px] rounded-[1rem] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:block dark:border-white/10 dark:bg-slate-950/78 z-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Wasatch Terrain Frame</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{frameZoneLabel}</div>
      </div>

      {!showHexOverlay ? <div className="pointer-events-none absolute left-4 top-24 hidden max-w-[240px] rounded-[1rem] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.12)] backdrop-blur-2xl xl:block dark:border-white/10 dark:bg-slate-950/78 z-10">
        <div className="text-xs font-semibold text-slate-900">{selectedZone.name} UAC Zone</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <span className="h-px w-8 border-t-2 border-dashed border-slate-700" />
          Reference boundary
        </div>
      </div> : null}

      {showOverviewForecast ? <div className="absolute left-4 top-[10.4rem] hidden w-[300px] rounded-[1rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.12)] xl:block dark:border-white/10 dark:bg-slate-950 z-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Hex-derived zone forecast</div>
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={onShowAllZones}
            className={`flex items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2 text-left ${!focusSelectedZone ? "border-slate-300 bg-slate-50 dark:border-white/15 dark:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"}`}
          >
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">All zones</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Return to the full Wasatch frame</div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Frame</span>
          </button>
          {zoneForecastRows.map((row) => (
            <button key={row.id} type="button" onClick={() => onSelectZone(row.id)} className={`flex items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-2 text-left ${row.id === selectedZone.id && focusSelectedZone ? "border-slate-300 bg-slate-50 dark:border-white/15 dark:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:hover:bg-slate-900"}`}>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">{row.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.cellCount} hex · {row.elevatedShare}% considerable+</div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${DANGER_META[row.rating].classes}`}>{DANGER_META[row.rating].label}</span>
            </button>
          ))}
        </div>
      </div> : null}

      <div className="absolute right-4 top-4 z-10 w-[188px] sm:w-[228px]">
        <MapLegendItems title={legend.title} subtitle={legend.subtitle} compact={false} items={legend.items} scale={legend.scale} />
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 hidden rounded-[1rem] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.12)] backdrop-blur-2xl xl:block dark:border-white/10 dark:bg-slate-950/78 z-10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-accent" />Active overlay: {activeOverlay}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Route className="h-3.5 w-3.5 text-primary" />Route planning preview {layers.routeSegments ? "enabled" : "disabled"}</div>
      </div>

      <div className="pointer-events-none absolute bottom-16 right-4 hidden items-center gap-2 rounded-[1rem] border border-white/70 bg-white/80 px-3 py-2 shadow-[0_12px_34px_rgba(15,23,42,0.12)] backdrop-blur-2xl xl:flex dark:border-white/10 dark:bg-slate-950/78 z-10">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-400 text-[11px] font-black text-slate-900">N</div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">North</div>
      </div>
    </div>
  );
}
