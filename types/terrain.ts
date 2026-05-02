export type DangerRating = "low" | "moderate" | "considerable" | "high" | "extreme";
export type ConfidenceLevel = "low" | "moderate" | "high";
export type ElevationBand = "below-treeline" | "near-treeline" | "above-treeline";
export type OverlayMetric = "danger" | "slope" | "aspect" | "elevation" | "wind" | "traps" | "snowpack" | "storm";
export type ObservationType = "avalanche" | "snowpack" | "weather" | "infrastructure";

export interface PointGeometry {
  type: "Point";
  coordinates: [number, number];
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

export interface LineStringGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface GeoFeature<G, P = Record<string, unknown>> {
  type: "Feature";
  geometry: G;
  properties: P;
}

export interface AvalancheProblem {
  id: string;
  type: string;
  likelihood: string;
  size: string;
  aspect: string[];
  elevation: string;
  discussion: string;
}

export interface ForecastZone {
  id: string;
  name: string;
  region: string;
  issuedAt: string;
  geometry: GeoFeature<PolygonGeometry, { zoneId: string; zoneName: string }>;
  summary: string;
  terrainIntelSummary: string;
  forecastHeadline: string;
  danger: {
    overall: DangerRating;
    aboveTreeline: DangerRating;
    nearTreeline: DangerRating;
    belowTreeline: DangerRating;
  };
  confidence: ConfidenceLevel;
  recentSnowfallIn: number;
  windSpeedMph: number;
  windDirection: string;
  temperatureF: number;
  snowForecast?: ZoneSnowForecast;
  avalancheProblems: AvalancheProblem[];
}

export interface ForecastOverview {
  issuedAt: string;
  defaultZoneId: string;
  zones: ForecastZone[];
}

export interface ZoneSnowForecast {
  next24hIn: number | null;
  next72hIn: number | null;
  qpfNext24hIn: number | null;
  snowLevelFt: number | null;
  precipitationProbabilityPercent: number | null;
  summary: string;
}

export interface WeatherObservation {
  temperatureF: number | null;
  windSpeedMph: number | null;
  windGustMph: number | null;
  windDirection: string;
  snowDepthIn: number | null;
  snowfall24hIn: number | null;
  humidityPercent: number | null;
  snowWaterEquivalentIn?: number | null;
  snowDepthDelta24hIn?: number | null;
}

export interface WeatherTrendPoint {
  timestamp: string;
  snowDepthIn: number | null;
  snowWaterEquivalentIn: number | null;
  temperatureF: number | null;
}

export interface WeatherStation {
  id: string;
  name: string;
  source: string;
  zoneId: string;
  elevationFt: number;
  geometry: GeoFeature<PointGeometry, { stationId: string }>;
  observation: WeatherObservation;
  trend: string;
  lastUpdated: string;
  priority?: "primary-snowpack" | "live-weather";
  history?: WeatherTrendPoint[];
  notes?: string[];
}

export interface TerrainHexCell {
  id: string;
  zoneId: string;
  h3Index: string;
  geometry: GeoFeature<PolygonGeometry, { cellId: string; zoneId: string }>;
  centroid: [number, number];
  dangerRating: DangerRating;
  slopeAngleBand: string;
  aspect: string;
  elevationFt: number;
  elevationBand: ElevationBand;
  terrainTrapProximity: string;
  loadingExposure: string;
  snowDepthIn: number;
  snowfall24hIn: number;
  windExposureIndex: number;
  snowpackScore: number;
  coverageSource: "imported" | "synthetic-fill";
  operationalSummary: string;
  cautionSummary: string;
  relativeRiskExplanation: string;
  score: number;
}

export interface TerrainCellDetails extends TerrainHexCell {
  routeSegments: RouteSegment[];
  neighboringCells: string[];
  scoreBreakdown: Array<{ factor: string; weight: number; contribution: number; summary: string }>;
}

export interface FieldObservation {
  id: string;
  type: ObservationType;
  zoneId: string;
  source: string;
  observedAt: string;
  title: string;
  summary: string;
  locationName: string;
  geometry: GeoFeature<PointGeometry, { observationId: string }>;
  tags: string[];
  avalancheObserved: boolean;
  media: string[];
}

export interface RouteSegment {
  id: string;
  zoneId: string;
  name: string;
  geometry: GeoFeature<LineStringGeometry, { routeId: string }>;
  exposureRating: DangerRating;
  notes: string;
}

export interface DailyBriefing {
  zoneId: string;
  issuedAt: string;
  executiveSummary: string;
  primaryConcerns: string[];
  weatherSummary: string;
  loadingSummary: string;
  operationalAdvice: string[];
  routeSegments: RouteSegment[];
  zoneOverviewTable: Array<{
    label: string;
    value: string;
    status: DangerRating | ConfidenceLevel;
  }>;
}

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface SourceStatusLayer {
  mode: string;
  label: string;
  detail: string;
}

export interface SourceStatus {
  strictMode: boolean;
  zoneCount: number;
  terrainCellCount: number;
  zoneBoundaries: SourceStatusLayer;
  terrainCells: SourceStatusLayer;
  forecastAdvisories: SourceStatusLayer;
}
