import type { DailyBriefing, FieldObservation, ForecastZone, TerrainCellDetails } from "@/types/terrain";
import type { SherpAIGuideModel } from "@/components/sherpai-guide-panel";

export interface SherpAIObservationDraft {
  title: string;
  type: FieldObservation["type"];
  source: string;
  locationName: string;
  summary: string;
  tags: string[];
  confidenceLabel: string;
  missingFields: string[];
  suggestedQuestions: string[];
  radioAcknowledgement: string;
}

function clampTags(tags: string[]) {
  return Array.from(new Set(tags)).slice(0, 6);
}

function detectObservationType(content: string): FieldObservation["type"] {
  if (/(avalanche|slide|caught|buried|crown)/i.test(content)) return "avalanche";
  if (/(wind|temp|weather|snowfall|precip|gust)/i.test(content)) return "weather";
  if (/(road|closure|control|lift|gate|infrastructure)/i.test(content)) return "infrastructure";
  return "snowpack";
}

function inferTags(content: string, zone: ForecastZone) {
  const tags = [zone.name, zone.danger.overall, zone.windDirection.toLowerCase()];
  if (/(wind|gust|loading|drift)/i.test(content)) tags.push("wind-loading");
  if (/(whumpf|collapse|crack)/i.test(content)) tags.push("instability");
  if (/(avalanche|slide|debris|crown)/i.test(content)) tags.push("avalanche-activity");
  if (/(storm|snowfall|new snow)/i.test(content)) tags.push("storm-snow");
  if (/(road|closure|control|mitigation)/i.test(content)) tags.push("operations");
  return clampTags(tags);
}

export function generateObservationDraft(input: {
  zone: ForecastZone;
  rawInput: string;
  transcript: string;
  source: string;
  locationHint: string;
  frequency: string;
  attachedFiles: string[];
}) {
  const content = [input.rawInput, input.transcript].filter(Boolean).join("\n").trim();
  const type = detectObservationType(content);
  const tags = inferTags(content, input.zone);
  const source = input.source.trim() || (input.frequency ? `Radio ${input.frequency}` : "Structured intake");
  const locationName = input.locationHint.trim() || `${input.zone.name} field sector`;
  const titlePrefix = type === "avalanche" ? "Avalanche signal" : type === "weather" ? "Weather update" : type === "infrastructure" ? "Operations note" : "Snowpack note";
  const confidenceLabel = content.length > 180 ? "High confidence extraction" : content.length > 90 ? "Moderate confidence extraction" : "Low confidence extraction";
  const summary = content
    ? `${titlePrefix} for ${input.zone.name}: ${content.replace(/\s+/g, " ").slice(0, 220)}${content.length > 220 ? "..." : ""}`
    : `Prepared a ${titlePrefix.toLowerCase()} draft using ${input.zone.name} danger, wind, and loading context.`;
  const missingFields = [
    !input.locationHint.trim() ? "Precise location or route segment" : undefined,
    !content ? "Observation details or radio transcript" : undefined,
    !input.source.trim() && !input.frequency ? "Observer identity or radio channel" : undefined,
    input.attachedFiles.length === 0 ? "Optional photo, audio, or field note attachment" : undefined,
  ].filter(Boolean) as string[];

  return {
    title: `${titlePrefix} · ${locationName}`,
    type,
    source,
    locationName,
    summary,
    tags,
    confidenceLabel,
    missingFields,
    suggestedQuestions: [
      `Confirm aspect and elevation band relative to ${input.zone.name}.`,
      `Capture any cracking, collapsing, or recent avalanche evidence.`,
      `Verify wind effect against the current ${input.zone.windDirection} flow.`,
    ],
    radioAcknowledgement: input.frequency
      ? `Prepared from the ${input.frequency} transcript for structured review before publish.`
      : "Ready to translate typed notes, uploads, or pasted transcripts into a structured observation draft.",
  } satisfies SherpAIObservationDraft;
}

export function buildTerrainDigest(cell: TerrainCellDetails, zone: ForecastZone) {
  return {
    headline: `${zone.name} cell ${cell.id} carries ${cell.dangerRating} terrain risk`,
    bullets: [
      `${cell.slopeAngleBand} on ${cell.aspect} aspects keeps this cell sensitive to route choice and exposure timing.`,
      `${cell.loadingExposure} loading combines with ${cell.terrainTrapProximity} terrain traps, raising consequence if a slide releases.`,
      cell.operationalSummary,
    ],
    prompt: "Compare this cell against neighboring terrain before committing to the route segments below.",
  };
}

export function buildTerrainGuide(cell: TerrainCellDetails, zone: ForecastZone): SherpAIGuideModel {
  const stance = cell.dangerRating;
  const confidenceLabel = cell.coverageSource === "imported" ? "High confidence terrain model" : "Moderate confidence terrain model";
  const cautionBand = stance === "low"
    ? "generally manageable terrain with localized caution"
    : stance === "moderate"
      ? "heightened attention required"
      : stance === "considerable"
        ? "dangerous pockets likely"
        : stance === "high"
          ? "very dangerous terrain setup"
          : "avoid / no-go terrain posture";

  return {
    roleLabel: "AI Field Guide",
    modeLabel: `${zone.name} terrain support`,
    stance,
    score: cell.score,
    zoneBaseline: zone.danger.overall,
    contextPills: [cell.slopeAngleBand, cell.aspect, `${cell.elevationFt.toLocaleString()} ft`, `${cell.snowfall24hIn} in / 24h`],
    systemLabel: `${zone.name} terrain support`,
    headline: `SherpAI is guiding ${zone.name} terrain decisions for cell ${cell.id}`,
    summary: `${cell.slopeAngleBand} on ${cell.aspect} terrain at ${cell.elevationFt.toLocaleString()} ft is being read as ${stance} from this cell's own terrain, weather, and observation stack. Cell rating ${stance} ${stance === zone.danger.overall ? "aligns with" : "differs from"} the ${zone.danger.overall} zone baseline.`,
    forecastTitle: `${zone.name} cell forecast: ${cautionBand}`,
    forecastNarrative: `SherpAI reads this clicked cell as ${stance} concern because ${cell.slopeAngleBand.toLowerCase()} terrain on ${cell.aspect} aspects is stacking with ${cell.loadingExposure.toLowerCase()}, ${cell.terrainTrapProximity.toLowerCase()}, and a snowpack field of ${cell.snowDepthIn} inches total depth with ${cell.snowfall24hIn} inches in the last 24 hours. This panel now follows the selected hex cell directly rather than inheriting the zone label when the two disagree.`,
    confidenceLabel,
    actionItems: [
      `Treat ${cell.loadingExposure.toLowerCase()} as the first route filter before committing to exposed terrain features.`,
      `Use ${cell.terrainTrapProximity.toLowerCase()} as the consequence check before moving below start zones or convex rollovers.`,
      `Cross-check this cell against neighboring cells and route segments before approving the next move.`,
    ],
    watchItems: [
      `${cell.snowfall24hIn} in of recent loading and ${cell.snowDepthIn} in total depth can shift this cell faster than adjacent terrain.`,
      `${cell.cautionSummary}`,
      `If observation evidence contradicts this read, update the operational posture before advancing the route.`,
    ],
    supportingFactors: [
      `Zone danger is ${zone.danger.overall}, but this clicked cell is ${stance} after re-scoring terrain, weather stations, and observations together.`,
      `${cell.loadingExposure} is interacting with ${cell.terrainTrapProximity.toLowerCase()} at ${cell.elevationFt.toLocaleString()} ft.`,
      `${cell.snowfall24hIn} inches of recent snow and ${cell.snowDepthIn} inches total depth keep the local snowpack active.`,
    ],
    suggestedPrompts: [
      `Compare this cell to the next two cells on the planned route and tell me where exposure increases.`,
      `Explain how wind effect and terrain traps combine here in operator language.`,
      `Turn this cell read into a short go / caution / no-go brief for the team.`,
    ],
    handoff: `SherpAI can now hand this terrain read into route planning, observation intake, or briefing language without losing zone context.`,
  };
}

export function buildBriefingDigest(briefing: DailyBriefing, zone: ForecastZone) {
  return {
    headline: `${zone.name} briefing digest`,
    bullets: [
      briefing.executiveSummary,
      `Primary concern focus: ${briefing.primaryConcerns.slice(0, 2).join("; ")}.`,
      `Operational lens: ${briefing.operationalAdvice.slice(0, 2).join("; ")}.`,
    ],
    action: `Cross-check route segments against ${zone.danger.overall} danger before exporting the final briefing.`,
  };
}