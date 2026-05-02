import { jsonRoute } from "@/lib/server/route-response";
import { getZoneResponse } from "@/lib/server/terrain-api";

export async function GET(_request: Request, context: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = await context.params;
  return jsonRoute(() => getZoneResponse(zoneId));
}