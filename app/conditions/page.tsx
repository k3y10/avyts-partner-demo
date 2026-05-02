"use client";

import { useMemo, useState } from "react";
import { ConditionCards } from "@/components/condition-cards";

const EMPTY_ZONES: never[] = [];
const EMPTY_STATIONS: never[] = [];
import { LoadingState, ErrorState } from "@/components/states";
import { WeatherStationMarkers } from "@/components/weather-station-markers";
import { ZoneList } from "@/components/zone-list";
import { useCurrentForecast } from "@/hooks/use-current-forecast";
import { useWeatherStations } from "@/hooks/use-weather-stations";
import { DEFAULT_ZONE_ID } from "@/lib/constants";

export default function ConditionsPage() {
  const [selectedZoneId, setSelectedZoneId] = useState(DEFAULT_ZONE_ID);
  const forecastQuery = useCurrentForecast();
  const weatherQuery = useWeatherStations();
  const zones = forecastQuery.data?.zones ?? EMPTY_ZONES;
  const stations = weatherQuery.data ?? EMPTY_STATIONS;
  const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) ?? zones[0], [selectedZoneId, zones]);

  if (forecastQuery.isLoading || weatherQuery.isLoading || !selectedZone) {
    return <div className="container py-10"><LoadingState title="Loading conditions dashboard" description="Building zone summaries, elevation danger, and weather telemetry." /></div>;
  }
  if (forecastQuery.isError || weatherQuery.isError) {
    return <div className="container py-10"><ErrorState title="Conditions dashboard unavailable" description="The forecast or station feed could not be loaded." /></div>;
  }

  return (
    <div className="container grid gap-6 py-8 xl:grid-cols-[320px,1fr] xl:items-stretch">
      <div className="h-full rounded-[1.4rem] border border-white/70 bg-white/84 p-4 shadow-[0_24px_54px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/72">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Forecast zones</div>
        <ZoneList zones={zones} selectedZoneId={selectedZone.id} onSelect={setSelectedZoneId} />
      </div>
      <div className="grid gap-6">
        <ConditionCards zone={selectedZone} />
        <WeatherStationMarkers stations={stations.filter((station) => station.zoneId === selectedZone.id)} />
      </div>
    </div>
  );
}
