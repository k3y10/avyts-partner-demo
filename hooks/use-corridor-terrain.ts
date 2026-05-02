"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllTerrainHexes } from "@/lib/api";

export function useCorridorTerrain() {
  return useQuery({ queryKey: ["terrain", "corridor"], queryFn: getAllTerrainHexes, staleTime: 60_000 });
}