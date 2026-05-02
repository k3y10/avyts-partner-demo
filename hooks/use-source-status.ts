"use client";

import { useQuery } from "@tanstack/react-query";
import { getSourceStatus } from "@/lib/api";

export function useSourceStatus() {
  return useQuery({ queryKey: ["sources", "status"], queryFn: getSourceStatus, staleTime: 60_000 });
}