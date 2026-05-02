import { DEFAULT_ZONE_ID } from "@/lib/constants";
import { jsonRoute } from "@/lib/server/route-response";
import { getDailyBriefingResponse } from "@/lib/server/terrain-api";

export function GET(request: Request) {
  const zoneId = new URL(request.url).searchParams.get("zone_id") ?? DEFAULT_ZONE_ID;
  return jsonRoute(() => getDailyBriefingResponse(zoneId));
}