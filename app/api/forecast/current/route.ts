import { jsonRoute } from "@/lib/server/route-response";
import { getForecastOverviewResponse } from "@/lib/server/terrain-api";

export function GET() {
  return jsonRoute(() => getForecastOverviewResponse());
}