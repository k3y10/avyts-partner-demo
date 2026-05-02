import { Mountain, Radar, ShieldAlert, Snowflake, Workflow, Bot, CloudSun, MapPinned, Route } from "lucide-react";
import type { DangerRating } from "@/types/terrain";

export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/conditions", label: "Conditions" },
  { href: "/observations", label: "Observations" },
  { href: "/reports", label: "Reports" },
];

export const DEFAULT_ZONE_ID = "salt-lake";

export const WASATCH_VIEW_STATE = {
  longitude: -111.68,
  latitude: 40.84,
  zoom: 8.52,
  pitch: 0,
  bearing: 0,
  padding: { top: 28, right: 28, bottom: 28, left: 28 },
};

export const LAYER_OPTIONS = [
  { id: "zones", label: "UAC Forecast Zones" },
  { id: "terrainHazardHex", label: "Terrain Hazard Hex" },
  { id: "slopeAngle", label: "Slope Angle" },
  { id: "aspect", label: "Aspect" },
  { id: "elevationBands", label: "Elevation Bands" },
  { id: "snowpackDepth", label: "Snowpack / Depth" },
  { id: "stormSnow", label: "24h Snow Forecast" },
  { id: "windLoading", label: "Wind Loading" },
  { id: "terrainTraps", label: "Terrain Traps" },
  { id: "weatherStations", label: "Weather Stations" },
  { id: "observations", label: "Observations" },
  { id: "routeSegments", label: "Route Planning Preview" },
] as const;

export const DANGER_META: Record<DangerRating, { label: string; classes: string; fill: [number, number, number, number] }> = {
  low: { label: "Low", classes: "border border-[#4b9a54] bg-[#56a85b] text-white shadow-sm", fill: [86, 168, 91, 244] },
  moderate: { label: "Moderate", classes: "border border-[#d8bf27] bg-[#f1d83b] text-slate-950 shadow-sm", fill: [241, 216, 59, 244] },
  considerable: { label: "Considerable", classes: "border border-[#de8b1e] bg-[#f29a20] text-white shadow-sm", fill: [242, 154, 32, 244] },
  high: { label: "High", classes: "border border-[#c9422d] bg-[#e15336] text-white shadow-sm", fill: [225, 83, 54, 244] },
  extreme: { label: "Extreme", classes: "border border-[#12151b] bg-[#1a1d24] text-white shadow-sm", fill: [26, 29, 36, 248] },
};

export const CAPABILITIES = [
  {
    title: "Persistent Wasatch frame",
    description: "A single Ogden-to-Provo basemap frame anchors every analysis mode so regional and slope-level context never drifts.",
    icon: MapPinned,
  },
  {
    title: "Terrain hazard hexes",
    description: "Deck.gl and H3 cells expose localized avalanche character tied to slope angle, aspect, loading, and terrain traps.",
    icon: ShieldAlert,
  },
  {
    title: "Weather + observation fusion",
    description: "Station telemetry, avalanche reports, and field observations are organized by zone for faster operational interpretation.",
    icon: CloudSun,
  },
  {
    title: "Route-aware briefings",
    description: "Operational summaries and route segment placeholders point toward future patrol, guide, SAR, and DOT workflows.",
    icon: Route,
  },
];

export const SHERPAI_FEATURES = [
  {
    title: "Field-ready summaries",
    description: "SherpAI distills zone headlines, hex-level cautions, and weather shifts into practical operational language.",
    icon: Bot,
  },
  {
    title: "Loading pattern awareness",
    description: "It highlights ridge-top wind loading, terrain trap clusters, and exposure changes across common travel corridors.",
    icon: Radar,
  },
  {
    title: "Transparent reasoning",
    description: "Every terrain cell keeps a simple factor-based explanation so teams can see why the score moved.",
    icon: Workflow,
  },
];

export const HERO_METRICS = [
  { label: "Forecast zones", value: "5 core Utah zones", icon: Mountain },
  { label: "Terrain cells", value: "H3-backed slope intelligence", icon: Snowflake },
  { label: "Operators", value: "Forecasters, patrol, SAR, DOT", icon: ShieldAlert },
];
