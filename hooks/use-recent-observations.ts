"use client";
import { useQuery } from "@tanstack/react-query";
import { getRecentObservations } from "@/lib/api";

export function useRecentObservations() {
  return useQuery({ queryKey: ["observations", "recent"], queryFn: getRecentObservations });
}
