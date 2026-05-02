import { cellToBoundary, cellToLatLng, gridDisk, latLngToCell } from "h3-js";
import { DEFAULT_ZONE_ID } from "@/lib/constants";
import type {
  DailyBriefing,
  FieldObservation,
  ForecastOverview,
  ForecastZone,
  RouteSegment,
  TerrainCellDetails,
  TerrainHexCell,
  WeatherStation,
} from "@/types/terrain";

const issuedAt = "2026-04-03T06:30:00Z";

const zoneSpecs = [
  {
    id: "logan",
    name: "Logan",
    region: "Northern Wasatch",
    polygon: [[[-111.99, 41.95], [-111.62, 41.95], [-111.55, 41.73], [-111.68, 41.46], [-112.02, 41.48], [-112.08, 41.74], [-111.99, 41.95]]],
    overall: "moderate",
    above: "considerable",
    near: "moderate",
    below: "low",
    snowfall: 5,
    wind: 28,
    direction: "WNW",
    temp: 18,
    confidence: "moderate",
    headline: "Wind drifts remain touchy along upper-elevation north half aspects.",
    summary: "Loading is focused along the Bear River Range ridges, while sheltered lower-elevation terrain remains comparatively manageable.",
    intel: "Localized hazard pockets cluster near wind-loaded start zones above Tony Grove and Naomi Peak.",
    problems: [
      { id: "logan-wind", type: "Wind Slab", likelihood: "Possible", size: "D1.5–D2", aspect: ["NW", "N", "NE", "E"], elevation: "Above Treeline", discussion: "Recent west winds created reactive drifts near exposed ridgelines." },
      { id: "logan-pwl", type: "Persistent Slab", likelihood: "Unlikely", size: "D2", aspect: ["N", "NE"], elevation: "Near Treeline", discussion: "Isolated deeper weaknesses remain in shaded terrain." },
    ],
    terrainSeeds: [
      { lat: 41.863, lng: -111.732, slope: 37, aspect: "NE", elevation: 9220, loading: "Lee-loaded by west wind", trap: "Moderate gully confinement", emphasis: "Bear River start zone" },
      { lat: 41.881, lng: -111.726, slope: 31, aspect: "N", elevation: 8740, loading: "Cross-loaded ribs", trap: "Low trap exposure", emphasis: "Naomi shoulder" },
    ],
  },
  {
    id: "ogden",
    name: "Ogden",
    region: "Northern Wasatch Front",
    polygon: [[[-112.12, 41.42], [-111.82, 41.42], [-111.73, 41.2], [-111.84, 40.99], [-112.08, 40.98], [-112.19, 41.18], [-112.12, 41.42]]],
    overall: "considerable",
    above: "considerable",
    near: "considerable",
    below: "moderate",
    snowfall: 9,
    wind: 31,
    direction: "W",
    temp: 21,
    confidence: "moderate",
    headline: "Persistent slab structure lingers on upper shady terrain near Ben Lomond and Powder Mountain.",
    summary: "Human-triggered avalanches remain possible on loaded northerly terrain near and above treeline.",
    intel: "Terrain cells spike on convex rollovers above terrain traps in the Ogden backcountry.",
    problems: [
      { id: "ogden-pwl", type: "Persistent Slab", likelihood: "Likely", size: "D2–D3", aspect: ["NW", "N", "NE"], elevation: "Near & Above Treeline", discussion: "A buried weak layer persists under recent loading." },
      { id: "ogden-wind", type: "Wind Slab", likelihood: "Possible", size: "D1.5–D2", aspect: ["N", "NE", "E"], elevation: "Above Treeline", discussion: "Localized drifts remain easy to identify and avoid." },
    ],
    terrainSeeds: [
      { lat: 41.296, lng: -111.838, slope: 38, aspect: "N", elevation: 9440, loading: "Cross-loaded alpine bowl", trap: "High gully trap exposure", emphasis: "Ben Lomond apron" },
      { lat: 41.243, lng: -111.782, slope: 33, aspect: "NE", elevation: 8910, loading: "Lee-loading in open glades", trap: "Moderate tree-well trap exposure", emphasis: "Powder Mountain glades" },
    ],
  },
  {
    id: "salt-lake",
    name: "Salt Lake",
    region: "Central Wasatch",
    polygon: [[[-112.05, 40.86], [-111.67, 40.86], [-111.61, 40.66], [-111.67, 40.49], [-111.86, 40.46], [-112.06, 40.58], [-112.05, 40.86]]],
    overall: "considerable",
    above: "high",
    near: "considerable",
    below: "moderate",
    snowfall: 14,
    wind: 39,
    direction: "W",
    temp: 16,
    confidence: "high",
    headline: "High danger persists above treeline on loaded north half terrain in the central Wasatch.",
    summary: "Natural avalanches remain possible in upper Little Cottonwood, Big Cottonwood, and upper Mill Creek.",
    intel: "Localized hexes flag severe loading in Cardiff Fork, Mineral Basin, and Days Fork terrain traps.",
    problems: [
      { id: "slc-pwl", type: "Persistent Slab", likelihood: "Likely", size: "D2.5–D3.5", aspect: ["NW", "N", "NE"], elevation: "Above Treeline", discussion: "Deep weak layers continue to produce large destructive avalanches." },
      { id: "slc-wind", type: "Wind Slab", likelihood: "Likely", size: "D2", aspect: ["N", "NE", "E", "SE"], elevation: "Above Treeline", discussion: "Strong west winds are building stiff slabs on lee terrain." },
      { id: "slc-storm", type: "Storm Slab", likelihood: "Possible", size: "D1.5–D2", aspect: ["All"], elevation: "All Elevations", discussion: "Fast loading continues in sheltered openings." },
    ],
    terrainSeeds: [
      { lat: 40.616, lng: -111.764, slope: 39, aspect: "N", elevation: 10120, loading: "Heavy west-to-east loading", trap: "High trap exposure below cliff bands", emphasis: "Cardiff Fork" },
      { lat: 40.588, lng: -111.774, slope: 36, aspect: "NE", elevation: 9800, loading: "Cross-loaded start zone", trap: "High runout confinement", emphasis: "Mineral Basin" },
      { lat: 40.637, lng: -111.734, slope: 33, aspect: "E", elevation: 9360, loading: "Lee-loading on rollovers", trap: "Moderate creek-cut trap exposure", emphasis: "Days Fork" },
    ],
  },
  {
    id: "provo",
    name: "Provo",
    region: "Southern Wasatch Front",
    polygon: [[[-111.96, 40.48], [-111.58, 40.48], [-111.49, 40.18], [-111.64, 40.03], [-111.87, 40.02], [-112.01, 40.23], [-111.96, 40.48]]],
    overall: "considerable",
    above: "considerable",
    near: "considerable",
    below: "moderate",
    snowfall: 10,
    wind: 27,
    direction: "W",
    temp: 20,
    confidence: "moderate",
    headline: "Storm and wind slabs remain the primary concern from Sundance through Timpanogos terrain.",
    summary: "Recent loading has created reactive pockets in upper-elevation start zones while low-angle forested terrain is more forgiving.",
    intel: "Terrain hexes emphasize upper American Fork and Timpanogos approaches where loading and traps overlap.",
    problems: [
      { id: "provo-storm", type: "Storm Slab", likelihood: "Likely", size: "D1.5–D2.5", aspect: ["N", "NE", "E"], elevation: "Near & Above Treeline", discussion: "Storm totals have stacked quickly in sheltered terrain." },
      { id: "provo-wind", type: "Wind Slab", likelihood: "Possible", size: "D2", aspect: ["N", "E", "SE"], elevation: "Above Treeline", discussion: "Fresh drifts exist around major alpine terrain transitions." },
    ],
    terrainSeeds: [
      { lat: 40.443, lng: -111.719, slope: 35, aspect: "NE", elevation: 9870, loading: "Lee-loaded cirque", trap: "High apron trap exposure", emphasis: "Timpanogos bowl" },
      { lat: 40.452, lng: -111.661, slope: 31, aspect: "N", elevation: 9140, loading: "Moderate cross-loading", trap: "Moderate creek trap exposure", emphasis: "Upper American Fork" },
    ],
  },
  {
    id: "uintas",
    name: "Uintas",
    region: "Western Uinta Mountains",
    polygon: [[[-111.35, 40.88], [-110.62, 40.88], [-110.51, 40.49], [-110.88, 40.29], [-111.36, 40.42], [-111.35, 40.88]]],
    overall: "moderate",
    above: "moderate",
    near: "moderate",
    below: "low",
    snowfall: 4,
    wind: 19,
    direction: "W",
    temp: 12,
    confidence: "moderate",
    headline: "Wind drifts are isolated but still deserve attention along exposed high ridges.",
    summary: "Terrain remains generally supportable with localized pockets of loading above treeline.",
    intel: "Hexes focus on cross-loaded bowls and broad alpine rollovers near Mirror Lake Highway terrain.",
    problems: [
      { id: "uinta-wind", type: "Wind Slab", likelihood: "Possible", size: "D1–D1.5", aspect: ["N", "NE", "E", "SE"], elevation: "Above Treeline", discussion: "Fresh drifts linger on the lee side of high ridges." },
    ],
    terrainSeeds: [
      { lat: 40.704, lng: -110.881, slope: 32, aspect: "E", elevation: 10820, loading: "Cross-loaded bowl", trap: "Moderate terrain depression", emphasis: "Mirror Lake ridge" },
      { lat: 40.733, lng: -110.966, slope: 28, aspect: "NE", elevation: 10390, loading: "Light lee-loading", trap: "Low trap exposure", emphasis: "Bald Mountain shoulder" },
    ],
  },
];

const zoneLookup = new Map(zoneSpecs.map((zone) => [zone.id, zone]));

const ratingOrder = ["low", "moderate", "considerable", "high", "extreme"] as const;

function ringRiskOffset(ringIndex: number) {
  return [0.1, 0.03, -0.05, -0.08][ringIndex] ?? -0.1;
}

function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashUnit(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return (hash % 10_000) / 10_000;
}

function polygonBounds(polygon: number[][]) {
  return polygon.reduce(
    (bounds, [lng, lat]) => ({
      minLng: Math.min(bounds.minLng, lng),
      maxLng: Math.max(bounds.maxLng, lng),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
    }),
    { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity },
  );
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

function aspectFromUnit(unit: number) {
  const aspects = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  return aspects[Math.min(aspects.length - 1, Math.floor(unit * aspects.length))];
}

function generateZoneCoverageIndexes(zone: (typeof zoneSpecs)[number]) {
  const polygon = zone.polygon[0];
  const bounds = polygonBounds(polygon);
  const indexes = new Set<string>();
  const latStep = 0.008;
  const lngStep = 0.008;

  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
      const h3Index = latLngToCell(lat, lng, 8);
      if (indexes.has(h3Index)) continue;
      const centroid = centroidFor(h3Index);
      if (pointInPolygon(centroid, polygon)) {
        indexes.add(h3Index);
      }
    }
  }

  zone.terrainSeeds.forEach((seed) => {
    const seedIndex = latLngToCell(seed.lat, seed.lng, 8);
    gridDisk(seedIndex, 2).forEach((index) => {
      const centroid = centroidFor(index);
      if (pointInPolygon(centroid, polygon)) {
        indexes.add(index);
      }
    });
  });

  return Array.from(indexes);
}

function scoreToDanger(score: number) {
  if (score >= 4.3) return "extreme";
  if (score >= 3.5) return "high";
  if (score >= 2.7) return "considerable";
  if (score >= 1.8) return "moderate";
  return "low";
}

function elevationBandFor(elevationFt: number): "below-treeline" | "near-treeline" | "above-treeline" {
  if (elevationFt >= 9600) return "above-treeline";
  if (elevationFt >= 8200) return "near-treeline";
  return "below-treeline";
}

function boundaryToPolygon(h3Index: string, zoneId: string, cellId: string) {
  const boundary = cellToBoundary(h3Index, true).map(([lat, lng]) => [lng, lat] as [number, number]);
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [[...boundary, boundary[0]]],
    },
    properties: {
      zoneId,
      cellId,
    },
  };
}

function centroidFor(h3Index: string): [number, number] {
  const [lat, lng] = cellToLatLng(h3Index);
  return [lng, lat];
}

export const mockZones: ForecastZone[] = zoneSpecs.map((zone) => ({
  id: zone.id,
  name: zone.name,
  region: zone.region,
  issuedAt,
  geometry: {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: zone.polygon },
    properties: { zoneId: zone.id, zoneName: zone.name },
  },
  summary: zone.summary,
  terrainIntelSummary: zone.intel,
  forecastHeadline: zone.headline,
  danger: {
    overall: zone.overall as ForecastZone["danger"]["overall"],
    aboveTreeline: zone.above as ForecastZone["danger"]["aboveTreeline"],
    nearTreeline: zone.near as ForecastZone["danger"]["nearTreeline"],
    belowTreeline: zone.below as ForecastZone["danger"]["belowTreeline"],
  },
  confidence: zone.confidence as ForecastZone["confidence"],
  recentSnowfallIn: zone.snowfall,
  windSpeedMph: zone.wind,
  windDirection: zone.direction,
  temperatureF: zone.temp,
  avalancheProblems: zone.problems,
}));

export const mockForecastOverview: ForecastOverview = {
  issuedAt,
  defaultZoneId: DEFAULT_ZONE_ID,
  zones: mockZones,
};

export const mockWeatherStations: WeatherStation[] = [
  { id: "alta-collins", name: "Alta Collins", source: "SNOTEL", zoneId: "salt-lake", elevationFt: 9640, geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.777, 40.59] }, properties: { stationId: "alta-collins" } }, observation: { temperatureF: 18, windSpeedMph: 28, windGustMph: 41, windDirection: "W", snowDepthIn: 142, snowfall24hIn: 14, humidityPercent: 71 }, trend: "Snow intensity easing, ridgeline winds still transportable.", lastUpdated: issuedAt },
  { id: "brighton", name: "Brighton Crest", source: "Resort WX", zoneId: "salt-lake", elevationFt: 8755, geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.809, 40.598] }, properties: { stationId: "brighton" } }, observation: { temperatureF: 21, windSpeedMph: 20, windGustMph: 33, windDirection: "WNW", snowDepthIn: 128, snowfall24hIn: 11, humidityPercent: 68 }, trend: "Steady snow totals with modest cooling.", lastUpdated: issuedAt },
  { id: "ben-lomond", name: "Ben Lomond Peak", source: "Remote station", zoneId: "ogden", elevationFt: 9712, geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.96, 41.37] }, properties: { stationId: "ben-lomond" } }, observation: { temperatureF: 14, windSpeedMph: 35, windGustMph: 51, windDirection: "W", snowDepthIn: 98, snowfall24hIn: 8, humidityPercent: 64 }, trend: "Strong ridge-top transport continues.", lastUpdated: issuedAt },
  { id: "timpanogos", name: "Mt Timpanogos", source: "Remote station", zoneId: "provo", elevationFt: 11250, geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.71, 40.39] }, properties: { stationId: "timpanogos" } }, observation: { temperatureF: 10, windSpeedMph: 32, windGustMph: 46, windDirection: "W", snowDepthIn: 156, snowfall24hIn: 12, humidityPercent: 73 }, trend: "High terrain still loading on lee features.", lastUpdated: issuedAt },
  { id: "tony-grove", name: "Tony Grove", source: "SNOTEL", zoneId: "logan", elevationFt: 8400, geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.72, 41.897] }, properties: { stationId: "tony-grove" } }, observation: { temperatureF: 20, windSpeedMph: 17, windGustMph: 25, windDirection: "NW", snowDepthIn: 118, snowfall24hIn: 5, humidityPercent: 70 }, trend: "Moderate loading above the basin.", lastUpdated: issuedAt },
  { id: "mirror-lake", name: "Mirror Lake", source: "SNOTEL", zoneId: "uintas", elevationFt: 10500, geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-110.88, 40.70] }, properties: { stationId: "mirror-lake" } }, observation: { temperatureF: 13, windSpeedMph: 16, windGustMph: 24, windDirection: "W", snowDepthIn: 96, snowfall24hIn: 4, humidityPercent: 62 }, trend: "Localized drifts remain the main concern.", lastUpdated: issuedAt },
];

export const mockObservations: FieldObservation[] = [
  { id: "obs-days-fork-natural", type: "avalanche", zoneId: "salt-lake", source: "UAC Forecaster", observedAt: "2026-04-02T19:10:00Z", title: "Natural D2 persistent slab in Days Fork", summary: "Crown averaged 80 cm deep on a north-facing start zone around 9,800 feet. Debris ran into valley-bottom terrain.", locationName: "Days Fork", geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.738, 40.643] }, properties: { observationId: "obs-days-fork-natural" } }, tags: ["persistent slab", "natural avalanche", "north aspect"], avalancheObserved: true, media: [] },
  { id: "obs-mineral-basin-wind", type: "avalanche", zoneId: "salt-lake", source: "Snowbird Patrol", observedAt: "2026-04-02T15:00:00Z", title: "Human-triggered wind slab above Mineral Basin", summary: "Triggered from ridge crest on a NE aspect. Slab propagated 200 meters and stepped into older storm snow.", locationName: "Mineral Basin", geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.783, 40.579] }, properties: { observationId: "obs-mineral-basin-wind" } }, tags: ["wind slab", "human triggered", "ridge"], avalancheObserved: true, media: [] },
  { id: "obs-mt-raymond-snowpit", type: "snowpack", zoneId: "salt-lake", source: "Guide Team", observedAt: "2026-04-01T18:20:00Z", title: "Reactive buried facets in shady terrain", summary: "ECTP12 at 70 cm on a north-facing slope near 9,400 feet. Weak layer remains reactive and propagates cleanly.", locationName: "Mt Raymond", geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.793, 40.683] }, properties: { observationId: "obs-mt-raymond-snowpit" } }, tags: ["snowpit", "facets", "ECTP12"], avalancheObserved: false, media: [] },
  { id: "obs-ben-lomond-weather", type: "weather", zoneId: "ogden", source: "UAC Observer", observedAt: "2026-04-02T13:40:00Z", title: "Transport observed along Ben Lomond ridge", summary: "Blowing snow visible on lee ribs. Small fresh cornices and wind pillows developing above treeline.", locationName: "Ben Lomond", geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.96, 41.366] }, properties: { observationId: "obs-ben-lomond-weather" } }, tags: ["transport", "wind loading"], avalancheObserved: false, media: [] },
  { id: "obs-timpanogos-field", type: "infrastructure", zoneId: "provo", source: "DOT Liaison", observedAt: "2026-04-02T11:30:00Z", title: "Runout concern above canyon approach", summary: "No release observed, but multiple loaded start zones are poised above the canyon access corridor. Monitor warming closely.", locationName: "Timpanogos approach", geometry: { type: "Feature", geometry: { type: "Point", coordinates: [-111.73, 40.423] }, properties: { observationId: "obs-timpanogos-field" } }, tags: ["runout", "operations"], avalancheObserved: false, media: [] },
];

export const mockRouteSegments: RouteSegment[] = [
  { id: "route-cardiff-ridge", zoneId: "salt-lake", name: "Cardiff ridge approach", geometry: { type: "Feature", geometry: { type: "LineString", coordinates: [[-111.774, 40.617], [-111.766, 40.628], [-111.758, 40.639]] }, properties: { routeId: "route-cardiff-ridge" } }, exposureRating: "high", notes: "Exposure rises rapidly above 9,700 ft where loaded north-facing start zones stack over traps." },
  { id: "route-mineral-traverse", zoneId: "salt-lake", name: "Mineral Basin traverse", geometry: { type: "Feature", geometry: { type: "LineString", coordinates: [[-111.79, 40.58], [-111.779, 40.586], [-111.768, 40.592]] }, properties: { routeId: "route-mineral-traverse" } }, exposureRating: "considerable", notes: "Stay low-angle and out from under steep northeast start zones." },
  { id: "route-lomond-ridge", zoneId: "ogden", name: "Ben Lomond ridge line", geometry: { type: "Feature", geometry: { type: "LineString", coordinates: [[-111.97, 41.337], [-111.959, 41.351], [-111.953, 41.367]] }, properties: { routeId: "route-lomond-ridge" } }, exposureRating: "considerable", notes: "Wind-loaded ribs and terrain traps rise near the summit cone." },
];

function terrainScore(zoneOverall: number, slope: number, elevationFt: number, loadingMultiplier: number, trapMultiplier: number) {
  const slopeFactor = slope >= 38 ? 1.4 : slope >= 33 ? 1.1 : slope >= 29 ? 0.8 : 0.4;
  const elevationFactor = elevationFt >= 9800 ? 1.1 : elevationFt >= 8600 ? 0.7 : 0.35;
  return zoneOverall + slopeFactor + elevationFactor + loadingMultiplier + trapMultiplier;
}

function zoneOverallNumeric(zoneId: string) {
  const overall = (zoneLookup.get(zoneId)?.overall ?? "moderate") as (typeof ratingOrder)[number];
  return ratingOrder.indexOf(overall) + 0.9;
}

export function getMockTerrainHexes(zoneId: string): TerrainHexCell[] {
  const zone = zoneLookup.get(zoneId) ?? zoneLookup.get(DEFAULT_ZONE_ID)!;
  const cells: TerrainHexCell[] = [];

  generateZoneCoverageIndexes(zone).forEach((h3Index, index) => {
    const centroid = centroidFor(h3Index);
    const unit = hashUnit(h3Index);
    const nearestSeed = zone.terrainSeeds.reduce(
      (closest, seed, seedIndex) => {
        const distance = distanceBetween(centroid, [seed.lng, seed.lat]);
        if (!closest || distance < closest.distance) {
          return { seed, seedIndex, distance };
        }
        return closest;
      },
      null as null | { seed: (typeof zone.terrainSeeds)[number]; seedIndex: number; distance: number },
    )!;

    const coverageInfluence = clamp(1 - nearestSeed.distance / 0.24, 0.18, 1);
    const slopeCenter = Math.round(clamp(nearestSeed.seed.slope - (1 - coverageInfluence) * 13 + (unit - 0.5) * 8, 22, 44));
    const slopeLow = Math.max(20, slopeCenter - 2);
    const slopeHigh = slopeCenter + 2;
    const elevationFt = Math.round(clamp(nearestSeed.seed.elevation - (1 - coverageInfluence) * 1600 + (unit - 0.5) * 360, 6200, 11200));
    const loadingIndex = clamp(coverageInfluence * 0.72 + zone.wind / 85 + unit * 0.18, 0.12, 1.55);
    const trapIndex = clamp(coverageInfluence * 0.55 + (1 - unit) * 0.2, 0.08, 1.15);
    const snowDepthIn = Math.round(clamp(52 + zone.snowfall * 4.5 + (elevationFt - 7600) / 95 + unit * 16, 24, 190));
    const snowfall24hIn = roundTo(clamp(zone.snowfall * (0.72 + coverageInfluence * 0.34 + unit * 0.08), 1.2, zone.snowfall + 5), 1);
    const snowpackScore = roundTo(clamp(zoneOverallNumeric(zone.id) * 0.7 + coverageInfluence * 1.1 + snowDepthIn / 120 + unit * 0.2, 0.8, 4.8), 2);
    const score = terrainScore(zoneOverallNumeric(zone.id), slopeCenter, elevationFt, loadingIndex, trapIndex) + snowpackScore * 0.18;
    const dangerRating = scoreToDanger(score);
    const aspect = coverageInfluence > 0.5 ? nearestSeed.seed.aspect : aspectFromUnit(unit);
    const terrainTrapProximity = trapIndex > 0.85 ? "High trap exposure" : trapIndex > 0.48 ? "Moderate trap exposure" : "Low trap exposure";
    const loadingExposure = loadingIndex > 1.1 ? `Heavy lee-loading from ${zone.direction} flow` : loadingIndex > 0.72 ? `Cross-loaded terrain under ${zone.direction} wind` : `Light wind effect from ${zone.direction} flow`;
    const cellId = `${zone.id}-${String(index).padStart(4, "0")}`;

    cells.push({
      id: cellId,
      zoneId: zone.id,
      h3Index,
      geometry: boundaryToPolygon(h3Index, zone.id, cellId),
      centroid,
      dangerRating,
      slopeAngleBand: `${slopeLow}–${slopeHigh}°`,
      aspect,
      elevationFt,
      elevationBand: elevationBandFor(elevationFt),
      terrainTrapProximity,
      loadingExposure,
      snowDepthIn,
      snowfall24hIn,
      windExposureIndex: roundTo(loadingIndex, 2),
      snowpackScore,
      coverageSource: "synthetic-fill",
      operationalSummary: `${nearestSeed.seed.emphasis} terrain remains ${dangerRating === "high" || dangerRating === "extreme" ? "a no-go decision point" : dangerRating === "considerable" ? "a cautious route-finding zone" : "a lower-consequence coverage cell"} under current loading.`,
      cautionSummary: `${loadingExposure}; ${terrainTrapProximity}. Snow depth is around ${snowDepthIn} in with ${snowfall24hIn} in in the last 24h.`,
      relativeRiskExplanation: `${zone.name} zone context is ${zone.overall}. This cell trends ${dangerRating} because slope, elevation, wind effect, terrain traps, and snowpack depth stack ${coverageInfluence > 0.6 ? "above" : "near"} the zone average.`,
      score: Number(score.toFixed(2)),
    });
  });

  return cells;
}

export function getMockTerrainCell(cellId: string): TerrainCellDetails | undefined {
  const zoneId = cellId.split("-").slice(0, 2).join("-").startsWith("salt-lake") ? "salt-lake" : cellId.split("-")[0];
  const cells = getMockTerrainHexes(zoneId);
  const cell = cells.find((item) => item.id === cellId);
  if (!cell) {
    return undefined;
  }
  return {
    ...cell,
    neighboringCells: cells.filter((candidate) => candidate.id !== cell.id).slice(0, 4).map((candidate) => candidate.id),
    routeSegments: mockRouteSegments.filter((segment) => segment.zoneId === zoneId),
    scoreBreakdown: [
      { factor: "Zone danger context", weight: 0.28, contribution: 1.2, summary: "Zone-wide danger keeps the baseline elevated before terrain specifics." },
      { factor: "Slope angle", weight: 0.24, contribution: 0.95, summary: `Slope band ${cell.slopeAngleBand} keeps the cell in classic avalanche terrain.` },
      { factor: "Elevation band", weight: 0.18, contribution: cell.elevationBand === "above-treeline" ? 0.82 : 0.55, summary: "Exposure increases near the alpine start zones and ridgeline loading pattern." },
      { factor: "Wind loading", weight: 0.18, contribution: 0.72, summary: cell.loadingExposure },
      { factor: "Terrain traps", weight: 0.12, contribution: 0.64, summary: cell.terrainTrapProximity },
      { factor: "Snowpack depth", weight: 0.14, contribution: cell.snowpackScore, summary: `${cell.snowDepthIn} in snow depth with ${cell.snowfall24hIn} in new snow in the past 24h.` },
    ],
  };
}

export function getMockBriefing(zoneId: string): DailyBriefing {
  const zone = mockZones.find((candidate) => candidate.id === zoneId) ?? mockZones.find((candidate) => candidate.id === DEFAULT_ZONE_ID)!;
  return {
    zoneId: zone.id,
    issuedAt,
    executiveSummary: `${zone.name} is operating under ${zone.danger.overall.toUpperCase()} terrain conditions with the highest sensitivity in loaded upper-elevation north half terrain. Terrain-intel hexes highlight where the forecast headline becomes operationally consequential.`,
    primaryConcerns: zone.avalancheProblems.map((problem) => `${problem.type}: ${problem.discussion}`),
    weatherSummary: `${zone.recentSnowfallIn} inches of snow in the last 24 hours with ${zone.windDirection} winds averaging ${zone.windSpeedMph} mph and temperatures near ${zone.temperatureF}°F.`,
    loadingSummary: zone.terrainIntelSummary,
    operationalAdvice: [
      "Keep travel framed around low-angle alternatives beneath loaded start zones.",
      "Use station and field observations to verify whether wind transport is still active.",
      "Brief teams on terrain traps before entering gullied or cliff-bounded terrain.",
    ],
    routeSegments: mockRouteSegments.filter((segment) => segment.zoneId === zone.id),
    zoneOverviewTable: [
      { label: "Overall danger", value: zone.danger.overall.toUpperCase(), status: zone.danger.overall },
      { label: "Above treeline", value: zone.danger.aboveTreeline.toUpperCase(), status: zone.danger.aboveTreeline },
      { label: "Recent snowfall", value: `${zone.recentSnowfallIn} in / 24h`, status: zone.confidence },
      { label: "Confidence", value: zone.confidence.toUpperCase(), status: zone.confidence },
    ],
  };
}
