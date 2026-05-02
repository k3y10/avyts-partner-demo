import { DEFAULT_ZONE_ID } from "@/lib/constants";
import {
  getMockBriefing,
  getMockTerrainCell,
  getMockTerrainHexes,
  mockForecastOverview,
  mockObservations,
  mockWeatherStations,
  mockZones,
} from "@/data/mock-api";
import {
  getLocalAllTerrainHexes,
  getLocalForecastOverview,
  getLocalSourceStatus,
  getLocalTerrainCell,
  getLocalTerrainHexes,
  getLocalZone,
  getLocalZones,
} from "@/lib/local-imported";
import type {
  DailyBriefing,
  FieldObservation,
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

function apiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  return "/api";
}

async function request<T>(path: string, fallback: () => T | Promise<T>, options?: { allowFallback?: boolean }) {
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch {
    if (options?.allowFallback === false) {
      throw new Error(`Live request required for ${path}`);
    }
    return fallback();
  }
}

export function getHealth() {
  return request<HealthResponse>("/health", () => ({ status: "ok", service: "avyts-fallback", timestamp: new Date().toISOString() }));
}

export function getSourceStatus() {
  return request<SourceStatus>(
    "/sources/status",
    () => getLocalSourceStatus(),
    { allowFallback: !requireLiveTerrainData() },
  );
}

export function getZones() {
  return request<ForecastZone[]>("/zones", () => getLocalZones().catch(() => mockZones), { allowFallback: !requireLiveTerrainData() });
}

export function getZone(zoneId: string) {
  return request<ForecastZone>(`/zones/${zoneId}`, () => getLocalZone(zoneId).catch(() => mockZones.find((zone) => zone.id === zoneId) ?? mockZones.find((zone) => zone.id === DEFAULT_ZONE_ID)!), { allowFallback: !requireLiveTerrainData() });
}

export function getCurrentForecast() {
  return request<ForecastOverview>("/forecast/current", () => getLocalForecastOverview().catch(() => mockForecastOverview), { allowFallback: !requireLiveTerrainData() });
}

export function getWeatherStations() {
  return request<WeatherStation[]>("/weather/stations", () => mockWeatherStations, { allowFallback: !requireLiveTerrainData() });
}

export function getWeatherStation(stationId: string) {
  return request<WeatherStation>(`/weather/stations/${stationId}`, () => mockWeatherStations.find((station) => station.id === stationId) ?? mockWeatherStations[0], { allowFallback: !requireLiveTerrainData() });
}

export function getTerrainHexes(zoneId: string = DEFAULT_ZONE_ID) {
  return request<TerrainHexCell[]>(`/terrain/hex?zone_id=${zoneId}`, () => getLocalTerrainHexes(zoneId).catch(() => getMockTerrainHexes(zoneId)), { allowFallback: !requireLiveTerrainData() });
}

export async function getAllTerrainHexes() {
  try {
    const zones = await getZones();
    const cellsByZone = await Promise.all(zones.map((zone) => getTerrainHexes(zone.id)));
    return cellsByZone.flat().sort((first, second) => second.score - first.score);
  } catch {
    if (requireLiveTerrainData()) {
      throw new Error("Live terrain hexes are required");
    }
    return getLocalAllTerrainHexes().catch(() => mockZones.flatMap((zone) => getMockTerrainHexes(zone.id)));
  }
}

export function getTerrainCell(cellId: string) {
  return request<TerrainCellDetails>(`/terrain/cell/${cellId}`, () => getLocalTerrainCell(cellId).catch(() => getMockTerrainCell(cellId) ?? getMockTerrainCell(getMockTerrainHexes(DEFAULT_ZONE_ID)[0].id)!), { allowFallback: !requireLiveTerrainData() });
}

export function getRecentObservations() {
  return request<FieldObservation[]>("/observations/recent", () => mockObservations, { allowFallback: !requireLiveTerrainData() });
}

export function getDailyBriefing(zoneId: string = DEFAULT_ZONE_ID) {
  return request<DailyBriefing>(`/reports/daily-briefing?zone_id=${zoneId}`, () => getMockBriefing(zoneId), { allowFallback: !requireLiveTerrainData() });
}
