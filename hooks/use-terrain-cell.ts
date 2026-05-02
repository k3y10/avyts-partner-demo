"use client";
import { useQuery } from "@tanstack/react-query";
import { getTerrainCell } from "@/lib/api";

export function useTerrainCell(cellId?: string) {
  return useQuery({ queryKey: ["terrain", "cell", cellId], queryFn: () => getTerrainCell(cellId!), enabled: Boolean(cellId) });
}
