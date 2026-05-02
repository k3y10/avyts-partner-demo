import { jsonRoute } from "@/lib/server/route-response";
import { getZonesResponse } from "@/lib/server/terrain-api";

export function GET() {
  return jsonRoute(() => getZonesResponse());
}