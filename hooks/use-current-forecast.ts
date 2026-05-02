"use client";
import { useQuery } from "@tanstack/react-query";
import { getCurrentForecast } from "@/lib/api";

export function useCurrentForecast() {
  return useQuery({ queryKey: ["forecast", "current"], queryFn: getCurrentForecast });
}
