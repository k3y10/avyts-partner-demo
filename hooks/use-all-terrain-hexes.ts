"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllTerrainHexes } from "@/lib/api";

export function useAllTerrainHexes() {
  return useQuery({ queryKey: ["terrain", "hex", "all"], queryFn: getAllTerrainHexes });
}