import "server-only";

import { listPrimarySnowpackStations } from "@/lib/server/live-snowpack";
import type { WeatherStation } from "@/types/terrain";

type WeatherValue = {
  unitCode?: string;
  value?: number | null;
};

type PointPayload = {
  properties?: {
    observationStations?: string;
  };
};

type StationFeature = {
  id?: string;
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    stationIdentifier?: string;
    name?: string;
    elevation?: WeatherValue;
    provider?: string;
    subProvider?: string;
    distance?: WeatherValue;
  };
};

type StationCollectionPayload = {
  features?: StationFeature[];
};

type LatestObservationPayload = {
  properties?: {
    timestamp?: string;
    textDescription?: string;
    temperature?: WeatherValue;
    dewpoint?: WeatherValue;
    windDirection?: WeatherValue;
    windSpeed?: WeatherValue;
    windGust?: WeatherValue;
    relativeHumidity?: WeatherValue;
  };
};

type ZoneWeatherReference = {
  zoneId: string;
  latitude: number;
  longitude: number;
};

const CACHE_TTL_MS = 15 * 60 * 1000;

const ZONE_WEATHER_REFERENCES: ZoneWeatherReference[] = [
  { zoneId: "logan", latitude: 41.897, longitude: -111.72 },
  { zoneId: "ogden", latitude: 41.296, longitude: -111.838 },
  { zoneId: "salt-lake", latitude: 40.59, longitude: -111.777 },
  { zoneId: "provo", latitude: 40.39, longitude: -111.71 },
  { zoneId: "uintas", latitude: 40.704, longitude: -110.881 },
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

function metersToFeet(value: number | null) {
  return value === null ? 0 : Math.round(value * 3.28084);
}

function celsiusToFahrenheit(value: number | null) {
  return value === null ? null : Math.round((value * 9) / 5 + 32);
}

function kmhToMph(value: number | null) {
  return value === null ? null : Math.round(value * 0.621371);
}

function metersPerSecondToMph(value: number | null) {
  return value === null ? null : Math.round(value * 2.23694);
}

function convertTemperatureToFahrenheit(reading: WeatherValue | undefined) {
  const value = asNumber(reading?.value);
  if (value === null) {
    return null;
  }

  if (reading?.unitCode?.includes("degF")) {
    return Math.round(value);
  }

  return celsiusToFahrenheit(value);
}

function convertSpeedToMph(reading: WeatherValue | undefined) {
  const value = asNumber(reading?.value);
  if (value === null) {
    return null;
  }

  if (reading?.unitCode?.includes("km_h-1")) {
    return kmhToMph(value);
  }

  if (reading?.unitCode?.includes("m_s-1")) {
    return metersPerSecondToMph(value);
  }

  return Math.round(value);
}

function degreesToCardinal(value: number | null) {
  if (value === null) {
    return "Variable";
  }

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.floor(((value + 22.5) % 360) / 45)] ?? "Variable";
}

function calculateRelativeHumidity(temperatureC: number | null, dewpointC: number | null) {
  if (temperatureC === null || dewpointC === null) {
    return null;
  }

  const actualVaporPressure = Math.exp((17.625 * dewpointC) / (243.04 + dewpointC));
  const saturationVaporPressure = Math.exp((17.625 * temperatureC) / (243.04 + temperatureC));
  const humidity = Math.round((actualVaporPressure / saturationVaporPressure) * 100);
  return Math.max(0, Math.min(100, humidity));
}

function stationSourceLabel(candidate: StationFeature) {
  const provider = candidate.properties?.provider?.trim();
  const subProvider = candidate.properties?.subProvider?.trim();
  return [subProvider, provider].filter(Boolean).join(" / ") || "NWS";
}

function stationScore(candidate: StationFeature) {
  const elevationM = asNumber(candidate.properties?.elevation?.value) ?? 0;
  const distanceKm = (asNumber(candidate.properties?.distance?.value) ?? Number.MAX_SAFE_INTEGER) / 1000;
  const provider = `${candidate.properties?.provider ?? ""} ${candidate.properties?.subProvider ?? ""}`.toLowerCase();

  let providerBonus = 0;
  if (provider.includes("mesowest") || provider.includes("snownet")) {
    providerBonus += 220;
  }
  if (provider.includes("dot")) {
    providerBonus += 160;
  }
  if (provider.includes("asos") || provider.includes("awos") || provider.includes("other-mtr")) {
    providerBonus += 40;
  }

  return elevationM - distanceKm * 22 + providerBonus;
}

function selectCandidates(candidates: StationFeature[], limit = 3) {
  const ranked = [...candidates].sort((left, right) => {
    const scoreDelta = stationScore(right) - stationScore(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const leftDistance = asNumber(left.properties?.distance?.value) ?? Number.MAX_SAFE_INTEGER;
    const rightDistance = asNumber(right.properties?.distance?.value) ?? Number.MAX_SAFE_INTEGER;
    return leftDistance - rightDistance;
  });

  const withinReasonableRange = ranked.filter((candidate) => ((asNumber(candidate.properties?.distance?.value) ?? Number.MAX_SAFE_INTEGER) / 1000) <= 120);
  const pool = withinReasonableRange.length ? withinReasonableRange : ranked;
  return pool.slice(0, limit);
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
    throw new Error(`Weather request failed: ${response.status} ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchZoneStations(zone: ZoneWeatherReference) {
  const pointPayload = await fetchJson<PointPayload>(`https://api.weather.gov/points/${zone.latitude},${zone.longitude}`);
  const stationsUrl = pointPayload.properties?.observationStations;
  if (!stationsUrl) {
    return [] as WeatherStation[];
  }

  const stationCollection = await fetchJson<StationCollectionPayload>(stationsUrl);
  const candidates = selectCandidates(stationCollection.features ?? [], 1);

  const stations = await Promise.all(
    candidates.map(async (candidate) => {
      const stationId = candidate.properties?.stationIdentifier ?? candidate.id?.split("/").pop();
      const latestUrl = `${candidate.id?.replace(/\/$/, "")}/observations/latest`;

      if (!stationId || !candidate.id || !latestUrl) {
        return null;
      }

      const latest = await fetchJson<LatestObservationPayload>(latestUrl);
      const latestProperties = latest.properties ?? {};
      const temperatureC = asNumber(latestProperties.temperature?.value);
      const dewpointC = asNumber(latestProperties.dewpoint?.value);
      const humidity = asNumber(latestProperties.relativeHumidity?.value);
      const coordinates = candidate.geometry?.coordinates;

      if (!coordinates || coordinates.length !== 2) {
        return null;
      }

      return {
        id: stationId,
        name: candidate.properties?.name ?? stationId,
        source: stationSourceLabel(candidate),
        zoneId: zone.zoneId,
        elevationFt: metersToFeet(asNumber(candidate.properties?.elevation?.value)),
        geometry: {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(coordinates[0]), Number(coordinates[1])],
          },
          properties: { stationId },
        },
        observation: {
          temperatureF: convertTemperatureToFahrenheit(latestProperties.temperature),
          windSpeedMph: convertSpeedToMph(latestProperties.windSpeed),
          windGustMph: convertSpeedToMph(latestProperties.windGust),
          windDirection: degreesToCardinal(asNumber(latestProperties.windDirection?.value)),
          snowDepthIn: null,
          snowfall24hIn: null,
          humidityPercent: humidity ?? calculateRelativeHumidity(temperatureC, dewpointC),
        },
        trend: latestProperties.textDescription ?? "Latest live observation",
        lastUpdated: latestProperties.timestamp ?? new Date().toISOString(),
        priority: "live-weather",
        notes: ["Nearest live weather observation selected from weather.gov station inventory."],
      } satisfies WeatherStation;
    }),
  );

  return stations.filter((station): station is WeatherStation => station !== null);
}

export async function listLiveWeatherStations() {
  if (cachedStations && cachedStations.expiresAt > Date.now()) {
    return cachedStations.stations;
  }

  const [snowpackStations, liveWeatherStations] = await Promise.all([
    listPrimarySnowpackStations().catch(() => [] as WeatherStation[]),
    Promise.all(ZONE_WEATHER_REFERENCES.map((zone) => fetchZoneStations(zone))),
  ]);

  const stations = [
    ...snowpackStations,
    ...liveWeatherStations.flat(),
  ].sort((left, right) => {
    const priorityScore = (station: WeatherStation) => (station.priority === "primary-snowpack" ? 1 : 0);
    const priorityDelta = priorityScore(right) - priorityScore(left);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    if (left.zoneId !== right.zoneId) {
      return left.zoneId.localeCompare(right.zoneId);
    }
    return right.elevationFt - left.elevationFt;
  });

  cachedStations = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    stations,
  };

  return stations;
}

export async function getLiveWeatherStation(stationId: string) {
  const stations = await listLiveWeatherStations();
  return stations.find((station) => station.id === stationId) ?? null;
}