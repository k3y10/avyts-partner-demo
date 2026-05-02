import "server-only";

import type { ZoneSnowForecast } from "@/types/terrain";

type GridValue = {
  validTime?: string;
  value?: number | null;
};

type WeatherValue = {
  validTime?: string;
  value?: Array<{
    weather?: string | null;
  }>;
};

type PointPayload = {
  properties?: {
    forecastGridData?: string;
  };
};

type GridpointPayload = {
  properties?: {
    snowfallAmount?: { values?: GridValue[] };
    quantitativePrecipitation?: { values?: GridValue[] };
    probabilityOfPrecipitation?: { values?: GridValue[] };
    snowLevel?: { values?: GridValue[] };
    weather?: { values?: WeatherValue[] };
  };
};

type ZoneForecastReference = {
  zoneId: string;
  latitude: number;
  longitude: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000;

const ZONE_FORECAST_REFERENCES: ZoneForecastReference[] = [
  { zoneId: "logan", latitude: 41.897, longitude: -111.72 },
  { zoneId: "ogden", latitude: 41.296, longitude: -111.838 },
  { zoneId: "salt-lake", latitude: 40.59, longitude: -111.777 },
  { zoneId: "provo", latitude: 40.39, longitude: -111.71 },
  { zoneId: "uintas", latitude: 40.704, longitude: -110.881 },
];

let cachedForecasts:
  | {
      expiresAt: number;
      forecasts: Map<string, ZoneSnowForecast>;
    }
  | null = null;

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseDurationMs(duration: string) {
  const [, days = "0", hours = "0", minutes = "0"] = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/) ?? [];
  return ((Number(days) * 24 + Number(hours)) * 60 + Number(minutes)) * 60 * 1000;
}

function intervalBounds(validTime: string) {
  const [startValue, durationValue] = validTime.split("/");
  const startMs = Date.parse(startValue);
  const durationMs = durationValue ? parseDurationMs(durationValue) : 0;
  return {
    startMs,
    endMs: startMs + durationMs,
  };
}

function overlapRatio(startMs: number, endMs: number, windowStartMs: number, windowEndMs: number) {
  const overlapStart = Math.max(startMs, windowStartMs);
  const overlapEnd = Math.min(endMs, windowEndMs);
  if (overlapEnd <= overlapStart || endMs <= startMs) {
    return 0;
  }
  return (overlapEnd - overlapStart) / (endMs - startMs);
}

function sumWindow(values: GridValue[] | undefined, windowHours: number) {
  const windowStartMs = Date.now();
  const windowEndMs = windowStartMs + windowHours * 60 * 60 * 1000;
  let hasData = false;
  let total = 0;

  for (const entry of values ?? []) {
    if (!entry.validTime) {
      continue;
    }

    const value = asNumber(entry.value);
    if (value === null) {
      continue;
    }

    const bounds = intervalBounds(entry.validTime);
    const ratio = overlapRatio(bounds.startMs, bounds.endMs, windowStartMs, windowEndMs);
    if (ratio <= 0) {
      continue;
    }

    hasData = true;
    total += value * ratio;
  }

  return hasData ? total : null;
}

function maxWindow(values: GridValue[] | undefined, windowHours: number) {
  const windowStartMs = Date.now();
  const windowEndMs = windowStartMs + windowHours * 60 * 60 * 1000;
  let result: number | null = null;

  for (const entry of values ?? []) {
    if (!entry.validTime) {
      continue;
    }

    const value = asNumber(entry.value);
    if (value === null) {
      continue;
    }

    const bounds = intervalBounds(entry.validTime);
    const ratio = overlapRatio(bounds.startMs, bounds.endMs, windowStartMs, windowEndMs);
    if (ratio <= 0) {
      continue;
    }

    result = result === null ? value : Math.max(result, value);
  }

  return result;
}

function minWindow(values: GridValue[] | undefined, windowHours: number) {
  const windowStartMs = Date.now();
  const windowEndMs = windowStartMs + windowHours * 60 * 60 * 1000;
  let result: number | null = null;

  for (const entry of values ?? []) {
    if (!entry.validTime) {
      continue;
    }

    const value = asNumber(entry.value);
    if (value === null) {
      continue;
    }

    const bounds = intervalBounds(entry.validTime);
    const ratio = overlapRatio(bounds.startMs, bounds.endMs, windowStartMs, windowEndMs);
    if (ratio <= 0) {
      continue;
    }

    result = result === null ? value : Math.min(result, value);
  }

  return result;
}

function weatherMentionsSnow(values: WeatherValue[] | undefined, windowHours: number) {
  const windowStartMs = Date.now();
  const windowEndMs = windowStartMs + windowHours * 60 * 60 * 1000;

  for (const entry of values ?? []) {
    if (!entry.validTime) {
      continue;
    }

    const bounds = intervalBounds(entry.validTime);
    const ratio = overlapRatio(bounds.startMs, bounds.endMs, windowStartMs, windowEndMs);
    if (ratio <= 0) {
      continue;
    }

    if ((entry.value ?? []).some((item) => /snow|wintry|sleet|ice pellets/i.test(item.weather ?? ""))) {
      return true;
    }
  }

  return false;
}

function mmToInches(value: number | null) {
  return value === null ? null : Number((value / 25.4).toFixed(1));
}

function metersToFeet(value: number | null) {
  return value === null ? null : Math.round(value * 3.28084);
}

function buildSummary(forecast: Omit<ZoneSnowForecast, "summary">, hasSnowMention: boolean) {
  const next24hLabel = forecast.next24hIn === null ? "--" : `${forecast.next24hIn} in`;
  const next72hLabel = forecast.next72hIn === null ? "--" : `${forecast.next72hIn} in`;
  const snowLevelLabel = forecast.snowLevelFt === null ? "variable snow level" : `snow level near ${forecast.snowLevelFt.toLocaleString()} ft`;

  if ((forecast.next24hIn ?? 0) <= 0 && !hasSnowMention) {
    return `No accumulating snow is currently projected in the next 24 hours. ${snowLevelLabel}.`;
  }

  return `NWS projects ${next24hLabel} in the next 24 hours and ${next72hLabel} in the next 72 hours, with ${snowLevelLabel}.`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/geo+json,application/json",
      "User-Agent": "AvyTS Terrain Intel TS/1.0 (+https://idefi.ai)",
    },
  });

  if (!response.ok) {
    throw new Error(`Zone forecast request failed: ${response.status} ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchZoneForecast(reference: ZoneForecastReference) {
  const pointPayload = await fetchJson<PointPayload>(`https://api.weather.gov/points/${reference.latitude},${reference.longitude}`);
  const forecastGridDataUrl = pointPayload.properties?.forecastGridData;
  if (!forecastGridDataUrl) {
    return null;
  }

  const gridpointPayload = await fetchJson<GridpointPayload>(forecastGridDataUrl);
  const properties = gridpointPayload.properties ?? {};

  const forecastBase = {
    next24hIn: mmToInches(sumWindow(properties.snowfallAmount?.values, 24)),
    next72hIn: mmToInches(sumWindow(properties.snowfallAmount?.values, 72)),
    qpfNext24hIn: mmToInches(sumWindow(properties.quantitativePrecipitation?.values, 24)),
    snowLevelFt: metersToFeet(minWindow(properties.snowLevel?.values, 24)),
    precipitationProbabilityPercent: maxWindow(properties.probabilityOfPrecipitation?.values, 24),
  } satisfies Omit<ZoneSnowForecast, "summary">;

  return {
    ...forecastBase,
    summary: buildSummary(forecastBase, weatherMentionsSnow(properties.weather?.values, 24)),
  } satisfies ZoneSnowForecast;
}

export async function listZoneSnowForecasts() {
  if (cachedForecasts && cachedForecasts.expiresAt > Date.now()) {
    return cachedForecasts.forecasts;
  }

  const forecasts = new Map<string, ZoneSnowForecast>();

  await Promise.all(
    ZONE_FORECAST_REFERENCES.map(async (reference) => {
      const forecast = await fetchZoneForecast(reference);
      if (forecast) {
        forecasts.set(reference.zoneId, forecast);
      }
    }),
  );

  cachedForecasts = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    forecasts,
  };

  return forecasts;
}

export async function getZoneSnowForecast(zoneId: string) {
  const forecasts = await listZoneSnowForecasts();
  return forecasts.get(zoneId) ?? null;
}