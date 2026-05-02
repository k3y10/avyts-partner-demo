import { jsonRoute } from "@/lib/server/route-response";
import { getWeatherStationResponse } from "@/lib/server/terrain-api";

export async function GET(_request: Request, context: { params: Promise<{ stationId: string }> }) {
  const { stationId } = await context.params;
  return jsonRoute(() => getWeatherStationResponse(stationId));
}