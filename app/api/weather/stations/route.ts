import { jsonRoute } from "@/lib/server/route-response";
import { getWeatherStationsResponse } from "@/lib/server/terrain-api";

export function GET() {
  return jsonRoute(() => getWeatherStationsResponse());
}