import { jsonRoute } from "@/lib/server/route-response";
import { getHealthResponse } from "@/lib/server/terrain-api";

export function GET() {
  return jsonRoute(() => getHealthResponse());
}