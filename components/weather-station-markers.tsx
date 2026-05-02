import { CloudSnow, Droplets, Mountain, Thermometer, TrendingUp, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherStation } from "@/types/terrain";

export function WeatherStationMarkers({ stations }: { stations: WeatherStation[] }) {
  const orderedStations = [...stations].sort((left, right) => {
    const priorityScore = (station: WeatherStation) => (station.priority === "primary-snowpack" ? 1 : 0);
    const priorityDelta = priorityScore(right) - priorityScore(left);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return right.elevationFt - left.elevationFt;
  });

  return (
    <Card className="glass-card topo-panel border-slate-300/80 bg-white/92 dark:border-white/10 dark:bg-slate-950/75">
      <CardHeader>
        <CardTitle>Live weather telemetry</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 xl:grid-cols-2">
        {orderedStations.length ? orderedStations.map((station) => (
          <div key={station.id} className="rounded-[1.25rem] border border-border bg-secondary/30 p-4 dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{station.name}</div>
                  {station.priority === "primary-snowpack" ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-800">Primary snowpack</span> : null}
                </div>
                <div className="text-xs text-muted-foreground">{station.source} · {station.elevationFt.toLocaleString()} ft</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(station.lastUpdated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <Stat icon={Thermometer} label="Temp" value={formatTemperature(station)} />
              <Stat icon={Wind} label="Wind" value={formatWind(station)} />
              <Stat icon={station.observation.snowDepthIn !== null ? CloudSnow : station.observation.snowWaterEquivalentIn != null ? Mountain : Droplets} label={primaryMetricLabel(station)} value={primaryMetricValue(station)} />
              <Stat icon={station.observation.snowDepthDelta24hIn != null ? TrendingUp : station.observation.snowWaterEquivalentIn != null ? Mountain : Droplets} label={secondaryMetricLabel(station)} value={secondaryMetricValue(station)} />
            </div>
            <TrendChart station={station} />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{station.trend}</p>
            {station.notes?.[0] ? <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{station.notes[0]}</p> : null}
          </div>
        )) : (
          <div className="rounded-[1.25rem] border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground xl:col-span-2 dark:bg-slate-900/40">
            No live station observations are currently available for this zone. The zone-level avalanche forecast is still live.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatTemperature(station: WeatherStation) {
  return station.observation.temperatureF === null ? "--" : `${station.observation.temperatureF}°F`;
}

function formatWind(station: WeatherStation) {
  if (station.observation.windSpeedMph === null) {
    return station.observation.windDirection || "--";
  }
  return `${station.observation.windDirection} ${station.observation.windSpeedMph} mph`;
}

function primaryMetricLabel(station: WeatherStation) {
  if (station.observation.snowDepthIn !== null) {
    return "Depth";
  }
  if (station.observation.snowWaterEquivalentIn != null) {
    return "SWE";
  }
  if (station.observation.humidityPercent !== null) {
    return "RH";
  }
  return "Mode";
}

function primaryMetricValue(station: WeatherStation) {
  if (station.observation.snowDepthIn !== null) {
    return `${station.observation.snowDepthIn} in`;
  }
  if (station.observation.snowWaterEquivalentIn != null) {
    return `${station.observation.snowWaterEquivalentIn} in`;
  }
  if (station.observation.humidityPercent !== null) {
    return `${station.observation.humidityPercent}%`;
  }
  return station.priority === "primary-snowpack" ? "Snowpack" : "Live obs";
}

function secondaryMetricLabel(station: WeatherStation) {
  if (station.observation.snowWaterEquivalentIn != null && station.observation.snowDepthIn !== null) {
    return "SWE";
  }
  if (station.observation.snowDepthDelta24hIn != null) {
    return "24h delta";
  }
  if (station.observation.humidityPercent !== null) {
    return "RH";
  }
  return "Source";
}

function secondaryMetricValue(station: WeatherStation) {
  if (station.observation.snowWaterEquivalentIn != null && station.observation.snowDepthIn !== null) {
    return `${station.observation.snowWaterEquivalentIn} in`;
  }
  if (station.observation.snowDepthDelta24hIn != null) {
    const snowDepthDelta24hIn = station.observation.snowDepthDelta24hIn;
    const prefix = snowDepthDelta24hIn > 0 ? "+" : "";
    return `${prefix}${snowDepthDelta24hIn.toFixed(1)} in`;
  }
  if (station.observation.humidityPercent !== null) {
    return `${station.observation.humidityPercent}%`;
  }
  return station.priority === "primary-snowpack" ? "NRCS" : "NWS";
}

function TrendChart({ station }: { station: WeatherStation }) {
  const history = (station.history ?? []).filter((point) => point.snowDepthIn !== null || point.snowWaterEquivalentIn !== null);
  if (history.length < 2) {
    return null;
  }

  const width = 220;
  const height = 72;
  const padding = 8;
  const values = history.flatMap((point) => [point.snowDepthIn ?? 0, point.snowWaterEquivalentIn ?? 0]);
  const maxValue = Math.max(...values, 1);

  return (
    <div className="mt-3 rounded-[1rem] border border-border bg-white/70 p-3 dark:bg-slate-950/70">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span>7-day snowpack trend</span>
        <span>{formatHistoryLabel(history[0]?.timestamp)} to {formatHistoryLabel(history[history.length - 1]?.timestamp)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-20 w-full overflow-visible">
        <path d={buildLinePath(history, width, height, padding, maxValue, "snowDepthIn")} fill="none" stroke="rgb(14 165 233)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={buildLinePath(history, width, height, padding, maxValue, "snowWaterEquivalentIn")} fill="none" stroke="rgb(71 85 105)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />Snow depth</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" />SWE</span>
      </div>
    </div>
  );
}

function buildLinePath(
  history: NonNullable<WeatherStation["history"]>,
  width: number,
  height: number,
  padding: number,
  maxValue: number,
  key: "snowDepthIn" | "snowWaterEquivalentIn",
) {
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return history.reduce((path, point, index) => {
    const value = point[key];
    if (value === null) {
      return path;
    }

    const x = padding + (innerWidth * index) / Math.max(history.length - 1, 1);
    const y = padding + innerHeight - (value / maxValue) * innerHeight;
    return `${path}${path ? " L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }, "");
}

function formatHistoryLabel(value: string | undefined) {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function Stat({ icon: Icon, label, value }: { icon: typeof Thermometer; label: string; value: string }) {
  return (
    <div className="rounded-[1rem] bg-white px-3 py-2 text-xs font-semibold text-foreground dark:bg-slate-950 dark:text-white">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span>{value}</span>
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </div>
  );
}
