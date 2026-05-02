import { gridDisk } from "h3-js";
import { DEFAULT_ZONE_ID } from "@/lib/constants";
import { getMockBriefing, getMockTerrainHexes, mockForecastOverview, mockZones } from "@/data/mock-api";
import type { ForecastOverview, ForecastZone, SourceStatus, TerrainCellDetails, TerrainHexCell } from "@/types/terrain";

type ImportedFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: TerrainHexCell["geometry"]["geometry"] | ForecastZone["geometry"]["geometry"];
    properties?: Record<string, unknown>;
    id?: string;
  }>;
};

let zonesPromise: Promise<ForecastZone[]> | null = null;
let terrainCellsPromise: Promise<TerrainHexCell[]> | null = null;
let mergedTerrainCellsPromise: Promise<TerrainHexCell[]> | null = null;

const dangerScale = ["low", "moderate", "considerable", "high", "extreme"] as const;

function polygonCentroid(coordinates: number[][][]) {
  const ring = coordinates[0] ?? [];
  if (!ring.length) return [0, 0] as [number, number];
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

function pointInPolygon(point: [number, number], polygon: number[][]) {
  const [x, y] = point;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceBetween(point: [number, number], target: [number, number]) {
  const lngDistance = point[0] - target[0];
  const latDistance = point[1] - target[1];
  return Math.sqrt(lngDistance * lngDistance + latDistance * latDistance);
}

function dangerIndex(value: TerrainHexCell["dangerRating"]) {
  return dangerScale.indexOf(value);
}

function smoothSyntheticCell(cell: TerrainHexCell, importedReference: TerrainHexCell) {
  const importedDanger = dangerIndex(importedReference.dangerRating);
  const syntheticDanger = dangerIndex(cell.dangerRating);
  const cappedDanger = dangerScale[Math.max(0, Math.min(importedDanger + 1, syntheticDanger))] ?? cell.dangerRating;
  return {
    ...cell,
    dangerRating: cappedDanger,
    score: Number(((cell.score + importedReference.score) / 2).toFixed(2)),
    snowDepthIn: Math.round((cell.snowDepthIn + importedReference.snowDepthIn) / 2),
    snowfall24hIn: Number(((cell.snowfall24hIn + importedReference.snowfall24hIn) / 2).toFixed(1)),
    snowpackScore: Number(((cell.snowpackScore + importedReference.snowpackScore) / 2).toFixed(2)),
    windExposureIndex: Number(((cell.windExposureIndex + importedReference.windExposureIndex) / 2).toFixed(2)),
    operationalSummary: `${cell.operationalSummary} Corridor-expanded from imported terrain coverage.`,
    relativeRiskExplanation: `${cell.relativeRiskExplanation} This is a corridor infill cell blended from nearby imported terrain rather than a standalone extreme pocket.`,
  } satisfies TerrainHexCell;
}

function expandImportedCoverage(imported: TerrainHexCell[], zoneId: string) {
  if (!imported.length) {
    return getMockTerrainHexes(zoneId);
  }

  const synthetic = getMockTerrainHexes(zoneId);
  const syntheticByH3 = new Map(synthetic.map((cell) => [cell.h3Index || cell.id, cell]));
  const importedByH3 = new Map(imported.map((cell) => [cell.h3Index || cell.id, cell]));
  const expanded = new Map(imported.map((cell) => [cell.h3Index || cell.id, cell]));

  imported.forEach((cell) => {
    if (!cell.h3Index) return;
    gridDisk(cell.h3Index, 1).forEach((neighborIndex) => {
      if (expanded.has(neighborIndex) || importedByH3.has(neighborIndex)) {
        return;
      }
      const syntheticCell = syntheticByH3.get(neighborIndex);
      if (!syntheticCell) {
        return;
      }

      const nearestImported = imported.reduce(
        (closest, candidate) => {
          const distance = distanceBetween(syntheticCell.centroid, candidate.centroid);
          if (!closest || distance < closest.distance) {
            return { cell: candidate, distance };
          }
          return closest;
        },
        null as null | { cell: TerrainHexCell; distance: number },
      )?.cell;

      if (!nearestImported) {
        return;
      }

      expanded.set(neighborIndex, smoothSyntheticCell(syntheticCell, nearestImported));
    });
  });

  return Array.from(expanded.values());
}

function inferZoneIdFromGeometry(geometry: ForecastZone["geometry"]["geometry"]) {
  const centroid = polygonCentroid(geometry.coordinates);
  const containingZone = mockZones.find((zone) => pointInPolygon(centroid, zone.geometry.geometry.coordinates[0]));
  if (containingZone) {
    return containingZone.id;
  }

  return mockZones.reduce(
    (closest, zone) => {
      const zoneCentroid = polygonCentroid(zone.geometry.geometry.coordinates);
      const distance = distanceBetween(centroid, zoneCentroid);
      if (!closest || distance < closest.distance) {
        return { id: zone.id, distance };
      }
      return closest;
    },
    null as null | { id: string; distance: number },
  )?.id ?? DEFAULT_ZONE_ID;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : fallback;
}

async function readCollection(path: string): Promise<ImportedFeatureCollection> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load local imported data: ${path}`);
  }
  return (await response.json()) as ImportedFeatureCollection;
}

function zoneIdFromProperties(properties: Record<string, unknown>) {
  const explicit = asString(properties.zoneId) || asString(properties.zone_id) || asString(properties.id) || asString(properties.forecast_key) || asString(properties.forecastKey);
  if (explicit) return slugify(explicit);
  return slugify(asString(properties.zoneName) || asString(properties.zone_name) || asString(properties.name) || DEFAULT_ZONE_ID);
}

async function loadZones() {
  if (!zonesPromise) {
    zonesPromise = readCollection("/terrain/zones.geojson").then((collection) => {
      const importedById = new Map<string, ForecastZone>();

      collection.features.forEach((feature) => {
        const properties = feature.properties ?? {};
        const explicitZoneId = zoneIdFromProperties(properties);
        const zoneId = explicitZoneId !== DEFAULT_ZONE_ID || Object.keys(properties).length ? explicitZoneId : inferZoneIdFromGeometry(feature.geometry as ForecastZone["geometry"]["geometry"]);
        const fallback = mockZones.find((zone) => zone.id === zoneId) ?? mockZones.find((zone) => zone.id === DEFAULT_ZONE_ID)!;
        const zoneName = asString(properties.zoneName) || asString(properties.zone_name) || asString(properties.name) || fallback.name;
        importedById.set(zoneId, {
          ...fallback,
          id: zoneId,
          name: zoneName,
          geometry: {
            type: "Feature" as const,
            geometry: feature.geometry as ForecastZone["geometry"]["geometry"],
            properties: { zoneId, zoneName },
          },
        } satisfies ForecastZone);
      });

      return mockZones.map((zone) => importedById.get(zone.id) ?? zone);
    });
  }
  return zonesPromise;
}

async function loadTerrainCells() {
  if (!terrainCellsPromise) {
    terrainCellsPromise = readCollection("/terrain/terrain_cells.geojson").then((collection) =>
      collection.features.map((feature) => {
        const properties = feature.properties ?? {};
        const zoneId = zoneIdFromProperties(properties);
        const cellId = asString(properties.cellId) || asString(properties.cell_id) || asString(feature.id) || `${zoneId}-cell`;
        const elevationFt = asNumber(properties.elevationFt) || asNumber(properties.elevation_ft);
        const centroid = Array.isArray(properties.centroid) && properties.centroid.length === 2
          ? [Number(properties.centroid[0]), Number(properties.centroid[1])] as [number, number]
          : [0, 0] as [number, number];
        return {
          id: cellId,
          zoneId,
          h3Index: asString(properties.h3Index) || asString(properties.h3_index),
          geometry: {
            type: "Feature" as const,
            geometry: feature.geometry as TerrainHexCell["geometry"]["geometry"],
            properties: { cellId, zoneId },
          },
          centroid,
          dangerRating: (asString(properties.dangerRating) || asString(properties.danger_rating) || "moderate") as TerrainHexCell["dangerRating"],
          slopeAngleBand: asString(properties.slopeAngleBand) || asString(properties.slope_angle_band) || "Unknown",
          aspect: asString(properties.aspect) || "Unknown",
          elevationFt,
          elevationBand: (asString(properties.elevationBand) || asString(properties.elevation_band) || "near-treeline") as TerrainHexCell["elevationBand"],
          terrainTrapProximity: asString(properties.terrainTrapProximity) || asString(properties.terrain_trap_proximity) || "Unknown",
          loadingExposure: asString(properties.loadingExposure) || asString(properties.loading_exposure) || "Unknown",
          snowDepthIn: asNumber(properties.snowDepthIn) || asNumber(properties.snow_depth_in) || Math.max(24, Math.round(elevationFt / 120)),
          snowfall24hIn: asNumber(properties.snowfall24hIn) || asNumber(properties.snowfall_24h_in) || 6,
          windExposureIndex: asNumber(properties.windExposureIndex) || asNumber(properties.wind_exposure_index) || 0.6,
          snowpackScore: asNumber(properties.snowpackScore) || asNumber(properties.snowpack_score) || 2.1,
          coverageSource: "imported",
          operationalSummary: asString(properties.operationalSummary) || asString(properties.operational_summary) || "Imported terrain cell.",
          cautionSummary: asString(properties.cautionSummary) || asString(properties.caution_summary) || "Imported terrain caution.",
          relativeRiskExplanation: asString(properties.relativeRiskExplanation) || asString(properties.relative_risk_explanation) || "Imported terrain scoring.",
          score: asNumber(properties.score),
        } satisfies TerrainHexCell;
      }),
    );
  }
  return terrainCellsPromise;
}

async function loadMergedTerrainCells() {
  if (!mergedTerrainCellsPromise) {
    mergedTerrainCellsPromise = Promise.all([loadTerrainCells(), loadZones()]).then(([importedCells, zones]) => {
      const importedByZone = new Map<string, TerrainHexCell[]>();
      importedCells.forEach((cell) => {
        const bucket = importedByZone.get(cell.zoneId) ?? [];
        bucket.push(cell);
        importedByZone.set(cell.zoneId, bucket);
      });

      return zones.flatMap((zone) => {
        const imported = importedByZone.get(zone.id) ?? [];
        const coverage = expandImportedCoverage(imported, zone.id);
        return coverage.sort((first, second) => second.score - first.score);
      });
    });
  }
  return mergedTerrainCellsPromise;
}

export async function getLocalForecastOverview(): Promise<ForecastOverview> {
  const zones = await loadZones();
  return {
    ...mockForecastOverview,
    zones,
  };
}

export async function getLocalZones(): Promise<ForecastZone[]> {
  return loadZones();
}

export async function getLocalZone(zoneId: string): Promise<ForecastZone> {
  const zones = await loadZones();
  return zones.find((zone) => zone.id === zoneId) ?? zones.find((zone) => zone.id === DEFAULT_ZONE_ID) ?? mockZones[0];
}

export async function getLocalTerrainHexes(zoneId: string): Promise<TerrainHexCell[]> {
  const cells = await loadMergedTerrainCells();
  return cells.filter((cell) => cell.zoneId === zoneId).sort((first, second) => second.score - first.score);
}

export async function getLocalAllTerrainHexes(): Promise<TerrainHexCell[]> {
  const cells = await loadMergedTerrainCells();
  return [...cells].sort((first, second) => second.score - first.score);
}

export async function getLocalTerrainCell(cellId: string): Promise<TerrainCellDetails> {
  const cells = await loadMergedTerrainCells();
  const cell = cells.find((candidate) => candidate.id === cellId) ?? cells[0];
  const zoneCells = cells.filter((candidate) => candidate.zoneId === cell.zoneId);
  const routeSegments = getMockBriefing(cell.zoneId).routeSegments;
  return {
    ...cell,
    neighboringCells: zoneCells.filter((candidate) => candidate.id !== cell.id).slice(0, 4).map((candidate) => candidate.id),
    routeSegments,
    scoreBreakdown: [
      { factor: "Zone danger context", weight: 0.28, contribution: 1.2, summary: "Zone-wide danger keeps the baseline elevated before terrain specifics." },
      { factor: "Slope angle", weight: 0.24, contribution: 0.95, summary: `Slope band ${cell.slopeAngleBand} keeps the cell in classic avalanche terrain.` },
      { factor: "Elevation band", weight: 0.18, contribution: cell.elevationBand === "above-treeline" ? 0.82 : 0.55, summary: "Exposure increases near the alpine start zones and ridgeline loading pattern." },
      { factor: "Wind loading", weight: 0.18, contribution: 0.72, summary: cell.loadingExposure },
      { factor: "Terrain traps", weight: 0.12, contribution: 0.64, summary: cell.terrainTrapProximity },
    ],
  };
}

export async function getLocalSourceStatus(): Promise<SourceStatus> {
  const [zones, importedCells, mergedCells] = await Promise.all([loadZones(), loadTerrainCells(), loadMergedTerrainCells()]);
  return {
    strictMode: false,
    zoneCount: zones.length,
    terrainCellCount: mergedCells.length,
    zoneBoundaries: {
      mode: "official-imported",
      label: "Official imported zones",
      detail: `Loaded ${zones.length} bundled UAC forecast-zone polygons.`,
    },
    terrainCells: {
      mode: "dem-derived",
      label: "DEM-derived terrain cells",
      detail: `Loaded ${importedCells.length} bundled DEM-derived terrain cells and expanded them to ${mergedCells.length} zone-coverage cells.`,
    },
    forecastAdvisories: {
      mode: "static-fallback",
      label: "Bundled forecast context",
      detail: "Rendering local fallback forecast context because the live backend is unavailable.",
    },
  };
}