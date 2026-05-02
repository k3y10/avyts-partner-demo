import "server-only";

import type { WeatherStation, WeatherTrendPoint } from "@/types/terrain";

type StationMetadataPayload = {
  stationTriplet?: string;
  name?: string;
  elevation?: number;
  latitude?: number;
  longitude?: number;
  dataTimeZone?: number;
};

type DataValuePayload = {
  date?: string;
  value?: number | null;
};

type StationDataPayload = {
  stationTriplet?: string;
  data?: Array<{
    stationElement?: {
      elementCode?: string;
    };
    values?: DataValuePayload[];
  }>;
};

type ZoneSnowpackReference = {
  zoneId: string;
  stationTriplet: string;
  fallbackName: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000;

const ZONE_SNOWPACK_REFERENCES: ZoneSnowpackReference[] = [
  { zoneId: "logan", stationTriplet: "823:UT:SNTL", fallbackName: "Tony Grove Lake" },
  { zoneId: "ogden", stationTriplet: "332:UT:SNTL", fallbackName: "Ben Lomond Peak" },
  { zoneId: "salt-lake", stationTriplet: "766:UT:SNTL", fallbackName: "Snowbird" },
  { zoneId: "provo", stationTriplet: "820:UT:SNTL", fallbackName: "Timpanogos Divide" },
  { zoneId: "uintas", stationTriplet: "828:UT:SNTL", fallbackName: "Trial Lake" },
];

let cachedStations:
  | {
      expiresAt: number;
      stations: WeatherStation[];
    }
  | null = null;

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function degreesToCardinal(value: number | null) {
  if (value === null) {
    return "Variable";
  }

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.floor(((value + 22.5) % 360) / 45)] ?? "Variable";
}

function formatOffset(hours: number | null | undefined) {
  const value = hours ?? 0;
  const sign = value >= 0 ? "+" : "-";
  const wholeHours = Math.abs(Math.trunc(value));
  return `${sign}${String(wholeHours).padStart(2, "0")}:00`;
}

function awdbDateToIso(value: string | undefined, offsetHours: number | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const normalized = value.trim().replace(" ", "T");
  const body = normalized.length > 10 ? `${normalized}:00` : `${normalized}T00:00:00`;
  return `${body}${formatOffset(offsetHours)}`;
}

function lastNumericValue(values: DataValuePayload[] | undefined) {
  const items = values ?? [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const value = asNumber(items[index]?.value);
    if (value !== null) {
      return {
        rawDate: items[index]?.date,
        value,
      };
    }
  }
  return null;
}

function previousNumericValue(values: DataValuePayload[] | undefined) {
  const items = (values ?? []).filter((entry) => asNumber(entry.value) !== null);
  if (items.length < 2) {
    return null;
  }

  const previous = items[items.length - 2];
  return {
    rawDate: previous.date,
    value: asNumber(previous.value),
  };
}

function buildHistory(
  snowDepthValues: DataValuePayload[] | undefined,
  sweValues: DataValuePayload[] | undefined,
  temperatureValues: DataValuePayload[] | undefined,
  offsetHours: number | null | undefined,
) {
  const history = new Map<string, WeatherTrendPoint>();

  for (const entry of snowDepthValues ?? []) {
    if (!entry.date) {
      continue;
    }
    history.set(entry.date, {
      timestamp: awdbDateToIso(entry.date, offsetHours),
      snowDepthIn: asNumber(entry.value),
      snowWaterEquivalentIn: null,
      temperatureF: null,
    });
  }

  for (const entry of sweValues ?? []) {
    if (!entry.date) {
      continue;
    }
    const existing = history.get(entry.date);
    history.set(entry.date, {
      timestamp: awdbDateToIso(entry.date, offsetHours),
      snowDepthIn: existing?.snowDepthIn ?? null,
      snowWaterEquivalentIn: asNumber(entry.value),
      temperatureF: existing?.temperatureF ?? null,
    });
  }

  for (const entry of temperatureValues ?? []) {
    if (!entry.date) {
      continue;
    }
    const dayKey = entry.date.slice(0, 10);
    const existing = history.get(dayKey);
    history.set(dayKey, {
      timestamp: existing?.timestamp ?? awdbDateToIso(dayKey, offsetHours),
      snowDepthIn: existing?.snowDepthIn ?? null,
      snowWaterEquivalentIn: existing?.snowWaterEquivalentIn ?? null,
      temperatureF: asNumber(entry.value),
    });
  }

  return [...history.values()]
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    .slice(-7);
}

function buildTrendSummary(snowDepthIn: number | null, snowDepthDelta24hIn: number | null, sweIn: number | null) {
  const parts: string[] = [];

  if (snowDepthIn !== null) {
    parts.push(`${snowDepthIn} in total depth`);
  }

  if (snowDepthDelta24hIn !== null) {
    if (snowDepthDelta24hIn > 0) {
      parts.push(`up ${snowDepthDelta24hIn.toFixed(1)} in vs yesterday`);
    } else if (snowDepthDelta24hIn < 0) {
      parts.push(`down ${Math.abs(snowDepthDelta24hIn).toFixed(1)} in vs yesterday`);
    } else {
      parts.push("steady vs yesterday");
    }
  }

  if (sweIn !== null) {
    parts.push(`${sweIn.toFixed(1)} in SWE`);
  }

  return parts.join(" · ") || "Live snowpack telemetry";
}

function stationIdFromTriplet(triplet: string) {
  return triplet.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildAwdbUrl(pathname: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return `https://wcc.sc.egov.usda.gov/awdbRestApi${pathname}?${query.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "AvyTS Terrain Intel TS/1.0 (+https://idefi.ai)",
    },
  });

  if (!response.ok) {
    throw new Error(`Snowpack request failed: ${response.status} ${url}`);
  }

  return (await response.json()) as T;
}

function indexStationData(payload: StationDataPayload[]) {
  const indexed = new Map<string, Map<string, DataValuePayload[]>>();

  for (const station of payload) {
    if (!station.stationTriplet) {
      continue;
    }

    const stationData = indexed.get(station.stationTriplet) ?? new Map<string, DataValuePayload[]>();
    for (const dataSeries of station.data ?? []) {
      const elementCode = dataSeries.stationElement?.elementCode;
      if (!elementCode) {
        continue;
      }
      stationData.set(elementCode, dataSeries.values ?? []);
    }
    indexed.set(station.stationTriplet, stationData);
  }

  return indexed;
}

export async function listPrimarySnowpackStations() {
  if (cachedStations && cachedStations.expiresAt > Date.now()) {
    return cachedStations.stations;
  }

  const stationTriplets = ZONE_SNOWPACK_REFERENCES.map((reference) => reference.stationTriplet).join(",");

  const [metadata, dailyData, hourlyData] = await Promise.all([
    fetchJson<StationMetadataPayload[]>(
      buildAwdbUrl("/services/v1/stations", {
        stationTriplets,
        activeOnly: "true",
      }),
    ),
    fetchJson<StationDataPayload[]>(
      buildAwdbUrl("/services/v1/data", {
        stationTriplets,
        elements: "SNWD,WTEQ",
        duration: "DAILY",
        beginDate: "-14",
        endDate: "0",
      }),
    ),
    fetchJson<StationDataPayload[]>(
      buildAwdbUrl("/services/v1/data", {
        stationTriplets,
        elements: "TOBS,WSPD,WDIR,RHUM",
        duration: "HOURLY",
        beginDate: "-1",
        endDate: "0",
      }),
    ),
  ]);

  const metadataByTriplet = new Map(metadata.map((station) => [station.stationTriplet ?? "", station]));
  const dailyByTriplet = indexStationData(dailyData);
  const hourlyByTriplet = indexStationData(hourlyData);

  const stations = ZONE_SNOWPACK_REFERENCES.map((reference) => {
    const stationMetadata = metadataByTriplet.get(reference.stationTriplet);
    if (!stationMetadata) {
      return null;
    }

    const dailySeries = dailyByTriplet.get(reference.stationTriplet) ?? new Map<string, DataValuePayload[]>();
    const hourlySeries = hourlyByTriplet.get(reference.stationTriplet) ?? new Map<string, DataValuePayload[]>();

    const latestSnowDepth = lastNumericValue(dailySeries.get("SNWD"));
    const previousSnowDepth = previousNumericValue(dailySeries.get("SNWD"));
    const latestSwe = lastNumericValue(dailySeries.get("WTEQ"));
    const latestTemperature = lastNumericValue(hourlySeries.get("TOBS"));
    const latestWindSpeed = lastNumericValue(hourlySeries.get("WSPD"));
    const latestWindDirection = lastNumericValue(hourlySeries.get("WDIR"));
    const latestHumidity = lastNumericValue(hourlySeries.get("RHUM"));

    const snowDepthDelta24hIn = latestSnowDepth && previousSnowDepth && previousSnowDepth.value !== null
      ? Number((latestSnowDepth.value - previousSnowDepth.value).toFixed(1))
      : null;

    const history = buildHistory(
      dailySeries.get("SNWD"),
      dailySeries.get("WTEQ"),
      hourlySeries.get("TOBS"),
      stationMetadata.dataTimeZone,
    );

    const latestTimestampSource = latestTemperature?.rawDate ?? latestSnowDepth?.rawDate;

    return {
      id: stationIdFromTriplet(reference.stationTriplet),
      name: stationMetadata.name ?? reference.fallbackName,
      source: "NRCS SNOTEL",
      zoneId: reference.zoneId,
      elevationFt: Math.round(stationMetadata.elevation ?? 0),
      geometry: {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [Number(stationMetadata.longitude ?? 0), Number(stationMetadata.latitude ?? 0)],
        },
        properties: { stationId: stationIdFromTriplet(reference.stationTriplet) },
      },
      observation: {
        temperatureF: latestTemperature?.value ?? null,
        windSpeedMph: latestWindSpeed?.value ?? null,
        windGustMph: null,
        windDirection: degreesToCardinal(latestWindDirection?.value ?? null),
        snowDepthIn: latestSnowDepth?.value ?? null,
        snowfall24hIn: null,
        humidityPercent: latestHumidity?.value ?? null,
        snowWaterEquivalentIn: latestSwe?.value ?? null,
        snowDepthDelta24hIn,
      },
      trend: buildTrendSummary(latestSnowDepth?.value ?? null, snowDepthDelta24hIn, latestSwe?.value ?? null),
      lastUpdated: awdbDateToIso(latestTimestampSource, stationMetadata.dataTimeZone),
      priority: "primary-snowpack",
      history,
      notes: [
        "Primary snowpack station for this avalanche zone.",
        latestWindSpeed?.value === null ? "Wind is not available at this SNOTEL station; use the live weather observation card for current flow." : "",
      ].filter(Boolean),
    } satisfies WeatherStation;
  }).filter((station): station is WeatherStation => station !== null);

  cachedStations = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    stations,
  };

  return stations;
}