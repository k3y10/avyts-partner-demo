"use client";
import { useQuery } from "@tanstack/react-query";
import { getTerrainHexes } from "@/lib/api";

export function useTerrainHexes(zoneId: string) {
  return useQuery({ queryKey: ["terrain", "hex", zoneId], queryFn: () => getTerrainHexes(zoneId), enabled: Boolean(zoneId) });
}
