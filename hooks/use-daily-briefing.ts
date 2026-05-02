"use client";
import { useQuery } from "@tanstack/react-query";
import { getDailyBriefing } from "@/lib/api";

export function useDailyBriefing(zoneId: string) {
  return useQuery({ queryKey: ["reports", "daily-briefing", zoneId], queryFn: () => getDailyBriefing(zoneId), enabled: Boolean(zoneId) });
}
