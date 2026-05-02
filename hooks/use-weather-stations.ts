"use client";
import { useQuery } from "@tanstack/react-query";
import { getWeatherStations } from "@/lib/api";

export function useWeatherStations() {
  return useQuery({ queryKey: ["weather", "stations"], queryFn: getWeatherStations });
}
