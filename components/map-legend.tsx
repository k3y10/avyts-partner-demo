import type { CSSProperties } from "react";
import { DANGER_META } from "@/lib/constants";

export interface MapLegendItem {
  key: string;
  label: string;
  description: string;
  swatchStyle: CSSProperties;
}

export interface MapLegendScale {
  label: string;
  minLabel: string;
  maxLabel: string;
  colors: string[];
  mode?: "indexed" | "spectrum";
}

const LEGEND_COPY: Record<string, string> = {
  low: "Generally safe",
  moderate: "Heightened attention",
  considerable: "Dangerous pockets",
  high: "Very dangerous",
  extreme: "Avoid / no go",
};

export function MapLegend({ title = "AvyTS Terrain Risk Scale", subtitle = "per hex cell", compact = false }: { title?: string; subtitle?: string; compact?: boolean }) {
  const items: MapLegendItem[] = Object.entries(DANGER_META).map(([key, value]) => ({
    key,
    label: value.label,
    description: LEGEND_COPY[key],
    swatchStyle: {
      backgroundColor: `rgba(${value.fill[0]}, ${value.fill[1]}, ${value.fill[2]}, ${value.fill[3] / 255})`,
      borderColor: value.label === "Extreme" ? "rgba(255,255,255,0.18)" : "rgba(15, 23, 42, 0.18)",
    },
  }));

  return <MapLegendItems title={title} subtitle={subtitle} compact={compact} items={items} />;
}

export function MapLegendItems({ title = "AvyTS Terrain Risk Scale", subtitle = "per hex cell", compact = false, items, scale }: { title?: string; subtitle?: string; compact?: boolean; items: MapLegendItem[]; scale?: MapLegendScale }) {
  return (
    <div className="rounded-[1.1rem] border border-slate-200 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
      {scale ? (
        <div className="mt-3 rounded-[0.9rem] border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span>{scale.label}</span>
            <span>{scale.mode === "spectrum" ? "spectrum" : "indexed"}</span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full border border-slate-200 dark:border-white/10">
            {scale.colors.map((color, index) => (
              <span key={`${color}-${index}`} className="h-full flex-1" style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-slate-500">
            <span>{scale.minLabel}</span>
            <span>{scale.maxLabel}</span>
          </div>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2.5">
        {items.map((item) => (
          <div key={item.key} className="grid grid-cols-[18px,1fr] items-center gap-x-3 gap-y-0.5 text-sm">
            <span
              className="block h-4 w-4 shrink-0 border"
              style={{
                ...item.swatchStyle,
                clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)",
              }}
            />
            <div className="font-semibold uppercase tracking-[0.04em] text-slate-900">{item.label}</div>
            {!compact ? <div /> : null}
            {!compact ? <div className="text-xs text-slate-500">{item.description}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
