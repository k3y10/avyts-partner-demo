import "server-only";

import { DEFAULT_ZONE_ID } from "@/lib/constants";
import {
  getMockBriefing,
  getMockTerrainCell,
  getMockTerrainHexes,
  mockForecastOverview,
  mockWeatherStations,
  mockZones,
} from "@/data/mock-api";
import {
  getLocalForecastOverview,
  getLocalSourceStatus,
  getLocalTerrainCell,
  getLocalTerrainHexes,
  getLocalZone,
  getLocalZones,
} from "@/lib/server/live-terrain-data";
import { getLiveWeatherStation, listLiveWeatherStations } from "@/lib/server/live-weather";
import { listObservations } from "@/lib/server/observation-store";
import type {
  DailyBriefing,
  ForecastOverview,
  ForecastZone,
  HealthResponse,
  SourceStatus,
  TerrainCellDetails,
  TerrainHexCell,
  WeatherStation,
} from "@/types/terrain";

function requireLiveTerrainData() {
  return process.env.NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA !== "0";
}

async function withTerrainFallback<T>(loader: () => Promise<T>, fallback: () => T, failureMessage: string) {
  try {
    return await loader();
  } catch (error) {
    if (requireLiveTerrainData()) {
      throw new Error(failureMessage, { cause: error });
    }
    return fallback();
  }
}

function fallbackSourceStatus(): SourceStatus {
  const terrainCellCount = mockZones.reduce((total, zone) => total + getMockTerrainHexes(zone.id).length, 0);
  return {
    strictMode: false,
    zoneCount: mockZones.length,
    terrainCellCount,
    zoneBoundaries: {
      mode: "synthetic-fallback",
      label: "Bundled synthetic zones",
      detail: `Serving ${mockZones.length} bundled Wasatch forecast-zone shapes directly from the Next.js app.`,
    },
    terrainCells: {
      mode: "synthetic-fallback",
      label: "Bundled synthetic terrain cells",
      detail: `Serving ${terrainCellCount} generated terrain cells without the Python DEM pipeline.`,
    },
    forecastAdvisories: {
      mode: "static-fallback",
      label: "Bundled forecast context",
      detail: "Using the built-in TypeScript forecast dataset for the Vercel-friendly deployment path.",
    },
  };
}

export function getHealthResponse(): HealthResponse {
  return {
    status: "ok",
    service: "avyts-next-api",
    timestamp: new Date().toISOString(),
  };
}

export function getSourceStatusResponse() {
  return withTerrainFallback(getLocalSourceStatus, fallbackSourceStatus, "Live terrain source status is required");
}

export function getZonesResponse(): Promise<ForecastZone[]> {
  return withTerrainFallback(getLocalZones, () => mockZones, "Live terrain zones are required");
}

export function getZoneResponse(zoneId: string): Promise<ForecastZone> {
  return withTerrainFallback(
    () => getLocalZone(zoneId),
    () => mockZones.find((zone) => zone.id === zoneId) ?? mockZones.find((zone) => zone.id === DEFAULT_ZONE_ID)!,
    `Live terrain zone ${zoneId} is required`,
  );
}

export function getForecastOverviewResponse(): Promise<ForecastOverview> {
  return withTerrainFallback(getLocalForecastOverview, () => mockForecastOverview, "Live forecast overview is required");
}

export async function getWeatherStationsResponse(): Promise<WeatherStation[]> {
  if (!requireLiveTerrainData()) {
    return mockWeatherStations;
  }

  return listLiveWeatherStations();
}

export async function getWeatherStationResponse(stationId: string): Promise<WeatherStation> {
  if (!requireLiveTerrainData()) {
    return mockWeatherStations.find((station) => station.id === stationId) ?? mockWeatherStations[0];
  }

  const station = await getLiveWeatherStation(stationId);
  if (!station) {
    throw new Error(`Live weather station ${stationId} is unavailable`);
  }

  return station;
}

export function getTerrainHexesResponse(zoneId: string): Promise<TerrainHexCell[]> {
  return withTerrainFallback(
    () => getLocalTerrainHexes(zoneId),
    () => getMockTerrainHexes(zoneId),
    `Live terrain hexes are required for ${zoneId}`,
  );
}

export function getTerrainCellResponse(cellId: string): Promise<TerrainCellDetails> {
  return withTerrainFallback(
    () => getLocalTerrainCell(cellId),
    () => getMockTerrainCell(cellId) ?? getMockTerrainCell(getMockTerrainHexes(DEFAULT_ZONE_ID)[0].id)!,
    `Live terrain cell ${cellId} is required`,
  );
}

function headlineCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getDailyBriefingResponse(zoneId: string): Promise<DailyBriefing> {
  if (!requireLiveTerrainData()) {
    return getMockBriefing(zoneId);
  }

  const [zone, terrainCells, observations] = await Promise.all([
    getLocalZone(zoneId),
    getLocalTerrainHexes(zoneId),
    listObservations(),
  ]);

  const zoneObservations = observations.filter((observation) => observation.zoneId === zoneId).slice(0, 3);
  const topCells = terrainCells.slice(0, 3);
  const primaryConcerns = [
    ...zone.avalancheProblems.map((problem) => `${problem.type}: ${problem.discussion}`),
    ...topCells.map((cell) => `${cell.id}: ${cell.cautionSummary}`),
    ...zoneObservations.map((observation) => `${observation.locationName}: ${observation.title}`),
  ].slice(0, 4);

  const operationalAdvice = [
    `Use ${zone.danger.aboveTreeline} danger as the upper-elevation baseline before committing to exposed terrain.`,
    topCells.length
      ? `Review imported terrain cells ${topCells.map((cell) => cell.id).join(", ")} before route approval.`
      : "No imported terrain cells are available for this zone; do not substitute synthetic routing guidance.",
    zoneObservations.length
      ? `Incorporate ${zoneObservations.length} submitted field observation${zoneObservations.length === 1 ? "" : "s"} into the operational brief.`
      : "No submitted field observations are available yet for this zone.",
  ];

  return {
    zoneId,
    issuedAt: zone.issuedAt,
    executiveSummary: zone.forecastHeadline,
    primaryConcerns,
    weatherSummary: zone.summary,
    loadingSummary: topCells.length
      ? topCells.map((cell) => `${cell.id} is reading ${cell.dangerRating} with ${cell.loadingExposure.toLowerCase()} and ${cell.terrainTrapProximity.toLowerCase()}.`).join(" ")
      : "Imported terrain-cell loading guidance is not yet available for this zone.",
    operationalAdvice,
    routeSegments: [],
    zoneOverviewTable: [
      { label: "Overall danger", value: headlineCase(zone.danger.overall), status: zone.danger.overall },
      { label: "Confidence", value: headlineCase(zone.confidence), status: zone.confidence },
      { label: "Observations", value: `${zoneObservations.length} submitted`, status: zone.confidence },
      { label: "Terrain cells", value: `${terrainCells.length} imported`, status: zone.danger.overall },
    ],
  };
}