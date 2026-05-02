import type { DangerRating, TerrainHexCell } from "@/types/terrain";

export interface ZoneRiskSummary {
  zoneId: string;
  cellCount: number;
  counts: Record<DangerRating, number>;
  weightedSeverity: number;
  overall: DangerRating;
  dominant: DangerRating;
}

const DANGER_ORDER: DangerRating[] = ["low", "moderate", "considerable", "high", "extreme"];

function emptyCounts(): Record<DangerRating, number> {
  return {
    low: 0,
    moderate: 0,
    considerable: 0,
    high: 0,
    extreme: 0,
  };
}

function severityIndex(value: DangerRating) {
  return DANGER_ORDER.indexOf(value);
}

function dominantRating(counts: Record<DangerRating, number>) {
  return DANGER_ORDER.reduce((winner, current) => {
    if (counts[current] > counts[winner]) {
      return current;
    }
    if (counts[current] === counts[winner] && severityIndex(current) > severityIndex(winner)) {
      return current;
    }
    return winner;
  }, "low" as DangerRating);
}

function overallFromCounts(counts: Record<DangerRating, number>, cellCount: number) {
  if (!cellCount) {
    return "low" as DangerRating;
  }

  const weightedSeverity = DANGER_ORDER.reduce((total, rating, index) => total + counts[rating] * index, 0) / cellCount;
  const rounded = Math.max(0, Math.min(DANGER_ORDER.length - 1, Math.round(weightedSeverity)));
  const dominant = dominantRating(counts);
  const highShare = (counts.high + counts.extreme) / cellCount;
  const extremeShare = counts.extreme / cellCount;

  if (extremeShare >= 0.18) {
    return "extreme" as DangerRating;
  }
  if (highShare >= 0.35 && rounded < 3) {
    return "high" as DangerRating;
  }
  return DANGER_ORDER[Math.max(rounded, severityIndex(dominant))] ?? dominant;
}

export function summarizeZoneRisk(zoneId: string, cells: TerrainHexCell[]): ZoneRiskSummary {
  const counts = cells.reduce((summary, cell) => {
    summary[cell.dangerRating] += 1;
    return summary;
  }, emptyCounts());
  const cellCount = cells.length;
  const weightedSeverity = cellCount
    ? DANGER_ORDER.reduce((total, rating, index) => total + counts[rating] * index, 0) / cellCount
    : 0;

  return {
    zoneId,
    cellCount,
    counts,
    weightedSeverity,
    overall: overallFromCounts(counts, cellCount),
    dominant: dominantRating(counts),
  };
}

export function buildZoneRiskSummaries(cells: TerrainHexCell[]) {
  const grouped = new Map<string, TerrainHexCell[]>();

  cells.forEach((cell) => {
    const bucket = grouped.get(cell.zoneId) ?? [];
    bucket.push(cell);
    grouped.set(cell.zoneId, bucket);
  });

  return Array.from(grouped.entries()).reduce<Record<string, ZoneRiskSummary>>((summaries, [zoneId, zoneCells]) => {
    summaries[zoneId] = summarizeZoneRisk(zoneId, zoneCells);
    return summaries;
  }, {});
}