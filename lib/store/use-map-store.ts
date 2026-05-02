import { create } from "zustand";
import { DEFAULT_ZONE_ID } from "@/lib/constants";

const METRIC_LAYER_IDS = ["slopeAngle", "aspect", "elevationBands", "snowpackDepth", "stormSnow", "windLoading", "terrainTraps"] as const;

export type ViewMode = "regional" | "terrain-intel";

interface MapStore {
  selectedZoneId: string;
  selectedCellId?: string;
  viewMode: ViewMode;
  layers: Record<string, boolean>;
  setZone: (zoneId: string) => void;
  setCell: (cellId?: string) => void;
  setViewMode: (viewMode: ViewMode) => void;
  toggleLayer: (layerId: string) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  selectedZoneId: DEFAULT_ZONE_ID,
  selectedCellId: undefined,
  viewMode: "terrain-intel",
  layers: {
    zones: true,
    terrainHazardHex: true,
    slopeAngle: false,
    aspect: false,
    elevationBands: false,
    snowpackDepth: false,
    stormSnow: false,
    windLoading: false,
    terrainTraps: false,
    weatherStations: false,
    observations: false,
    routeSegments: false,
  },
  setZone: (selectedZoneId) => set({ selectedZoneId, selectedCellId: undefined }),
  setCell: (selectedCellId) => set({ selectedCellId }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleLayer: (layerId) => set((state) => {
    if ((METRIC_LAYER_IDS as readonly string[]).includes(layerId)) {
      const isEnabling = !state.layers[layerId];
      const nextLayers: MapStore["layers"] = { ...state.layers };

      for (const metricLayerId of METRIC_LAYER_IDS) {
        nextLayers[metricLayerId] = false;
      }

      nextLayers[layerId] = isEnabling;
      if (isEnabling) {
        nextLayers.terrainHazardHex = true;
      }

      return { layers: nextLayers };
    }

    if (layerId === "terrainHazardHex") {
      const isEnabled = !state.layers.terrainHazardHex;
      const nextLayers: MapStore["layers"] = { ...state.layers, terrainHazardHex: isEnabled };

      if (!isEnabled) {
        for (const metricLayerId of METRIC_LAYER_IDS) {
          nextLayers[metricLayerId] = false;
        }
      }

      return { layers: nextLayers };
    }

    return { layers: { ...state.layers, [layerId]: !state.layers[layerId] } };
  }),
}));
