"use client";
import { useQuery } from "@tanstack/react-query";
import { getZones } from "@/lib/api";

export function useForecastZones() {
  return useQuery({ queryKey: ["zones"], queryFn: getZones });
}
