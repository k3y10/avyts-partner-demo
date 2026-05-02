import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_ZONE_ID } from "@/lib/constants";
import { getZoneSnowForecast } from "@/lib/server/live-zone-forecast";
import type { ForecastOverview, ForecastZone, SourceStatus, TerrainCellDetails, TerrainHexCell } from "@/types/terrain";

type ImportedFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: TerrainHexCell["geometry"]["geometry"] | ForecastZone["geometry"]["geometry"];
    properties?: Record<string, unknown>;
    id?: string | number;
  }>;
};

type UacAdvisory = Record<string, unknown>;
type DangerRating = ForecastZone["danger"]["overall"];

const ZONE_ORDER = ["logan", "ogden", "salt-lake", "provo", "uintas"] as const;
const TAG_RE = /<[^>]+>/g;
const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

let zonesPromise: Promise<ForecastZone[]> | null = null;
let terrainCellsPromise: Promise<TerrainHexCell[]> | null = null;

function polygonCentroid(coordinates: number[][][]) {
  const ring = coordinates[0] ?? [];
  if (!ring.length) {
    return [0, 0] as [number, number];
  }

  const totals = ring.reduce(
    (accumulator, [lng, lat]) => {
      accumulator.lng += lng;
      accumulator.lat += lat;
      return accumulator;
    },
    { lng: 0, lat: 0 },
  );

  return [totals.lng / ring.length, totals.lat / ring.length] as [number, number];
}

function decodeHtml(value: string) {
  return value.replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, (match) => HTML_ENTITIES[match] ?? match);
}

function cleanText(value: unknown, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = decodeHtml(String(value)).replace(TAG_RE, " ").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function zoneIdFromProperties(properties: Record<string, unknown>) {
  const explicit = asString(properties.zoneId) || asString(properties.zone_id) || asString(properties.id) || asString(properties.forecast_key) || asString(properties.forecastKey);
  if (explicit) {
    return slugify(explicit);
  }
  return slugify(asString(properties.zoneName) || asString(properties.zone_name) || asString(properties.name) || DEFAULT_ZONE_ID);
}

function zoneSortIndex(zoneId: string) {
  const index = ZONE_ORDER.indexOf(zoneId as (typeof ZONE_ORDER)[number]);
  return index === -1 ? ZONE_ORDER.length : index;
}

function normalizeDangerRating(value: string): DangerRating | "" {
  const rating = value.trim().toLowerCase();
  return rating === "low" || rating === "moderate" || rating === "considerable" || rating === "high" || rating === "extreme"
    ? rating
    : "";
}

function dangerFromNumericLevel(level: number): DangerRating {
  if (level >= 8) {
    return "extreme";
  }
  if (level >= 7) {
    return "high";
  }
  if (level >= 6) {
    return "considerable";
  }
  if (level >= 4) {
    return "moderate";
  }
  return "low";
}

function dangerFromRose(value: unknown) {
  const parts = String(value ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (parts.length !== 24) {
    return null;
  }

  const aboveTreeline = dangerFromNumericLevel(Math.max(...parts.slice(0, 8)));
  const nearTreeline = dangerFromNumericLevel(Math.max(...parts.slice(8, 16)));
  const belowTreeline = dangerFromNumericLevel(Math.max(...parts.slice(16, 24)));
  const overall = [aboveTreeline, nearTreeline, belowTreeline].reduce<DangerRating>((highest, current) => {
    return ["low", "moderate", "considerable", "high", "extreme"].indexOf(current)
      > ["low", "moderate", "considerable", "high", "extreme"].indexOf(highest)
      ? current
      : highest;
  }, "low");

  return { overall, aboveTreeline, nearTreeline, belowTreeline };
}

function advisoryProblems(advisory: UacAdvisory) {
  return [1, 2, 3]
    .map((index): ForecastZone["avalancheProblems"][number] | null => {
      const type = cleanText(advisory[`avalanche_problem_${index}`]);
      if (!type) {
        return null;
      }

      return {
        id: `uac-problem-${index}`,
        type,
        likelihood: "Reported",
        size: "Variable",
        aspect: [],
        elevation: "All elevations",
        discussion: cleanText(
          advisory[`avalanche_problem_${index}_description`],
          `${type} remains part of the current avalanche problem set.`,
        ),
      };
    })
    .filter((problem): problem is ForecastZone["avalancheProblems"][number] => problem !== null);
}

function averageRange(first: string, second: string) {
  return Math.round((Number(first) + Number(second)) / 2);
}

function extractSnowfallIn(text: string) {
  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:["”]|inches?)/i);
  if (rangeMatch) {
    return averageRange(rangeMatch[1], rangeMatch[2]);
  }

  const singleMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:["”]|inches?)\s*(?:of\s+)?snow/i);
  if (singleMatch) {
    return Math.round(Number(singleMatch[1]));
  }

  return 0;
}

function extractWindSpeedMph(text: string) {
  const rangeMatch = text.match(/(?:winds?|gusts?)[^.!?]{0,80}?(\d+)\s*(?:-|–|to)\s*(\d+)\s*mph/i);
  if (rangeMatch) {
    return averageRange(rangeMatch[1], rangeMatch[2]);
  }

  const singleMatch = text.match(/(?:winds?|gusts?)[^.!?]{0,80}?(\d+)\s*mph/i) ?? text.match(/(\d+)\s*mph/i);
  return singleMatch ? Math.round(Number(singleMatch[1])) : 0;
}

function extractTemperatureF(text: string) {
  const ridgeMatch = text.match(/ridgetops?[^.!?]{0,80}?(\d+)s\b/i) ?? text.match(/ridgetops?[^.!?]{0,80}?(\d+)\s*°?f\b/i);
  if (ridgeMatch) {
    return Math.round(Number(ridgeMatch[1]));
  }

  const tempMatch = text.match(/temperatures?[^.!?]{0,80}?(\d+)\s*°?f\b/i);
  if (tempMatch) {
    return Math.round(Number(tempMatch[1]));
  }

  return 0;
}

function extractWindDirection(text: string) {
  const directions: Array<[RegExp, string]> = [
    [/\bnorthwest\b|\bnw\b/i, "NW"],
    [/\bnortheast\b|\bne\b/i, "NE"],
    [/\bsouthwest\b|\bsw\b/i, "SW"],
    [/\bsoutheast\b|\bse\b/i, "SE"],
    [/\bnorth\b/i, "N"],
    [/\bsouth\b/i, "S"],
    [/\beast\b/i, "E"],
    [/\bwest\b/i, "W"],
  ];

  return directions.find(([pattern]) => pattern.test(text))?.[1] ?? "Variable";
}

function telemetryFromAdvisory(advisory: UacAdvisory) {
  const text = [
    cleanText(advisory.current_conditions),
    cleanText(advisory.mountain_weather),
    cleanText(advisory.bottom_line),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    recentSnowfallIn: extractSnowfallIn(text),
    windSpeedMph: extractWindSpeedMph(text),
    windDirection: extractWindDirection(text),
    temperatureF: extractTemperatureF(text),
  };
}

function issuedAtFromAdvisory(advisory: UacAdvisory) {
  const timestamp = asNumber(advisory.date_issued_timestamp);
  if (timestamp > 0) {
    return new Date(timestamp * 1000).toISOString();
  }
  return new Date().toISOString();
}

async function readCollection(assetPath: string): Promise<ImportedFeatureCollection> {
  const absolutePath = path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
  const payload = JSON.parse(await readFile(absolutePath, "utf8")) as ImportedFeatureCollection;
  if (payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    throw new Error(`Expected a GeoJSON FeatureCollection in ${assetPath}`);
  }
  return payload;
}

async function fetchAdvisory(regionSlug: string): Promise<UacAdvisory> {
  const response = await fetch(`https://utahavalanchecenter.org/forecast/${regionSlug}/json`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "AvyTS Terrain Intel TS/1.0 (+https://idefi.ai)",
    },
  });

  if (!response.ok) {
    throw new Error(`UAC advisory request failed for ${regionSlug}: ${response.status}`);
  }

  const payload = (await response.json()) as { advisories?: Array<{ advisory?: UacAdvisory }> };
  const advisory = payload.advisories?.[0]?.advisory;
  if (!advisory) {
    throw new Error(`UAC advisory payload missing for ${regionSlug}`);
  }

  return advisory;
}

async function loadZones() {
  if (!zonesPromise) {
    zonesPromise = readCollection("/terrain/zones.geojson").then(async (collection) => {
      const zones = await Promise.all(
        collection.features.map(async (feature) => {
          const properties = feature.properties ?? {};
          const zoneId = zoneIdFromProperties(properties);
          const zoneName = asString(properties.zoneName) || asString(properties.zone_name) || asString(properties.name) || zoneId;
          const forecastKey = asString(properties.forecast_key) || asString(properties.forecastKey) || zoneId;
          const [advisory, snowForecast] = await Promise.all([
            fetchAdvisory(forecastKey),
            getZoneSnowForecast(zoneId).catch(() => null),
          ]);
          const rose = dangerFromRose(advisory.overall_danger_rose);
          const overall = normalizeDangerRating(cleanText(advisory.overall_danger_rating)) || rose?.overall || "low";
          const telemetry = telemetryFromAdvisory(advisory);

          return {
            id: zoneId,
            name: zoneName,
            region: cleanText(advisory.region, asString(properties.center) || "Utah Avalanche Center"),
            issuedAt: issuedAtFromAdvisory(advisory),
            geometry: {
              type: "Feature" as const,
              geometry: feature.geometry as ForecastZone["geometry"]["geometry"],
              properties: { zoneId, zoneName },
            },
            summary: cleanText(advisory.current_conditions, cleanText(advisory.bottom_line, "Live UAC advisory summary unavailable.")),
            terrainIntelSummary: cleanText(advisory.recent_activity, cleanText(advisory.mountain_weather, "Live terrain intelligence unavailable.")),
            forecastHeadline: cleanText(advisory.bottom_line, "Live UAC forecast headline unavailable."),
            danger: {
              overall,
              aboveTreeline: rose?.aboveTreeline ?? overall,
              nearTreeline: rose?.nearTreeline ?? overall,
              belowTreeline: rose?.belowTreeline ?? overall,
            },
            confidence: rose ? "high" : "moderate",
            recentSnowfallIn: telemetry.recentSnowfallIn,
            windSpeedMph: telemetry.windSpeedMph,
            windDirection: telemetry.windDirection,
            temperatureF: telemetry.temperatureF,
            snowForecast: snowForecast ?? undefined,
            avalancheProblems: advisoryProblems(advisory),
          } satisfies ForecastZone;
        }),
      );

      return zones.sort((first, second) => zoneSortIndex(first.id) - zoneSortIndex(second.id) || first.name.localeCompare(second.name));
    });
  }

  return zonesPromise;
}

function elevationBand(elevationFt: number): TerrainHexCell["elevationBand"] {
  if (elevationFt >= 9600) {
    return "above-treeline";
  }
  if (elevationFt >= 8200) {
    return "near-treeline";
  }
  return "below-treeline";
}

async function loadTerrainCells() {
  if (!terrainCellsPromise) {
    terrainCellsPromise = readCollection("/terrain/terrain_cells.geojson").then((collection) =>
      collection.features.map((feature) => {
        const properties = feature.properties ?? {};
        const zoneId = zoneIdFromProperties(properties);
        const cellId = asString(properties.cellId) || asString(properties.cell_id) || String(feature.id ?? `${zoneId}-cell`);
        const elevationFt = Math.round(asNumber(properties.elevationFt) || asNumber(properties.elevation_ft));
        const geometry = feature.geometry as TerrainHexCell["geometry"]["geometry"];
        const centroid = Array.isArray(properties.centroid) && properties.centroid.length === 2
          ? [Number(properties.centroid[0]), Number(properties.centroid[1])] as [number, number]
          : geometry.type === "Polygon"
            ? polygonCentroid(geometry.coordinates)
            : [0, 0] as [number, number];

        return {
          id: cellId,
          zoneId,
          h3Index: asString(properties.h3Index) || asString(properties.h3_index),
          geometry: {
            type: "Feature" as const,
            geometry,
            properties: { cellId, zoneId },
          },
          centroid,
          dangerRating: (normalizeDangerRating(asString(properties.dangerRating) || asString(properties.danger_rating)) || "moderate") as TerrainHexCell["dangerRating"],
          slopeAngleBand: asString(properties.slopeAngleBand) || asString(properties.slope_angle_band) || "Unknown",
          aspect: asString(properties.aspect) || "Unknown",
          elevationFt,
          elevationBand: (asString(properties.elevationBand) || asString(properties.elevation_band) || elevationBand(elevationFt)) as TerrainHexCell["elevationBand"],
          terrainTrapProximity: asString(properties.terrainTrapProximity) || asString(properties.terrain_trap_proximity) || "Unknown",
          loadingExposure: asString(properties.loadingExposure) || asString(properties.loading_exposure) || "Unknown",
          snowDepthIn: Math.round(asNumber(properties.snowDepthIn) || asNumber(properties.snow_depth_in)),
          snowfall24hIn: Math.round((asNumber(properties.snowfall24hIn) || asNumber(properties.snowfall_24h_in)) * 10) / 10,
          windExposureIndex: Math.round((asNumber(properties.windExposureIndex) || asNumber(properties.wind_exposure_index)) * 100) / 100,
          snowpackScore: Math.round((asNumber(properties.snowpackScore) || asNumber(properties.snowpack_score)) * 100) / 100,
          coverageSource: "imported",
          operationalSummary: asString(properties.operationalSummary) || asString(properties.operational_summary) || "Imported terrain cell.",
          cautionSummary: asString(properties.cautionSummary) || asString(properties.caution_summary) || "Imported terrain caution.",
          relativeRiskExplanation: asString(properties.relativeRiskExplanation) || asString(properties.relative_risk_explanation) || "Imported terrain scoring.",
          score: Math.round(asNumber(properties.score) * 100) / 100,
        } satisfies TerrainHexCell;
      }),
    );
  }

  return terrainCellsPromise;
}

function latestIssuedAt(zones: ForecastZone[]) {
  const newest = zones.reduce<number>((latest, zone) => {
    const issuedAt = Date.parse(zone.issuedAt);
    return Number.isNaN(issuedAt) ? latest : Math.max(latest, issuedAt);
  }, 0);

  return newest ? new Date(newest).toISOString() : new Date().toISOString();
}

export async function getLocalForecastOverview(): Promise<ForecastOverview> {
  const zones = await loadZones();
  return {
    issuedAt: latestIssuedAt(zones),
    defaultZoneId: zones.find((zone) => zone.id === DEFAULT_ZONE_ID)?.id ?? zones[0]?.id ?? DEFAULT_ZONE_ID,
    zones,
  };
}

export async function getLocalZones(): Promise<ForecastZone[]> {
  return loadZones();
}

export async function getLocalZone(zoneId: string): Promise<ForecastZone> {
  const zones = await loadZones();
  const zone = zones.find((candidate) => candidate.id === zoneId) ?? zones.find((candidate) => candidate.id === DEFAULT_ZONE_ID);
  if (!zone) {
    throw new Error(`Live UAC zone ${zoneId} is unavailable`);
  }
  return zone;
}

export async function getLocalTerrainHexes(zoneId: string): Promise<TerrainHexCell[]> {
  const cells = await loadTerrainCells();
  return cells.filter((cell) => cell.zoneId === zoneId).sort((first, second) => second.score - first.score);
}

export async function getLocalTerrainCell(cellId: string): Promise<TerrainCellDetails> {
  const cells = await loadTerrainCells();
  const cell = cells.find((candidate) => candidate.id === cellId);
  if (!cell) {
    throw new Error(`Imported terrain cell ${cellId} is unavailable`);
  }

  const zoneCells = cells.filter((candidate) => candidate.zoneId === cell.zoneId);
  return {
    ...cell,
    neighboringCells: zoneCells.filter((candidate) => candidate.id !== cell.id).slice(0, 4).map((candidate) => candidate.id),
    routeSegments: [],
    scoreBreakdown: [
      { factor: "Zone danger context", weight: 0.28, contribution: 1.2, summary: "Live UAC zone danger sets the regional baseline before terrain specifics." },
      { factor: "Slope angle", weight: 0.24, contribution: 0.95, summary: `Slope band ${cell.slopeAngleBand} keeps the cell in classic avalanche terrain.` },
      { factor: "Elevation band", weight: 0.18, contribution: cell.elevationBand === "above-treeline" ? 0.82 : 0.55, summary: "Exposure increases as the terrain moves toward ridgeline start zones." },
      { factor: "Wind loading", weight: 0.18, contribution: Math.max(0.2, cell.windExposureIndex), summary: cell.loadingExposure },
      { factor: "Terrain traps", weight: 0.12, contribution: 0.64, summary: cell.terrainTrapProximity },
    ],
  };
}

export async function getLocalSourceStatus(): Promise<SourceStatus> {
  const [zones, cells] = await Promise.all([loadZones(), loadTerrainCells()]);
  return {
    strictMode: true,
    zoneCount: zones.length,
    terrainCellCount: cells.length,
    zoneBoundaries: {
      mode: "official-imported",
      label: "Imported UAC zones",
      detail: `Loaded ${zones.length} bundled UAC forecast-zone polygons.`,
    },
    terrainCells: {
      mode: "imported-static",
      label: "Imported terrain cells",
      detail: `Loaded ${cells.length} bundled terrain cells without synthetic expansion.`,
    },
    forecastAdvisories: {
      mode: "uac-live",
      label: "Live UAC advisories",
      detail: `Hydrated ${zones.length}/${zones.length} forecast zones from the live Utah Avalanche Center advisory feed.`,
    },
  };
}