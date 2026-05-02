import { jsonRoute } from "@/lib/server/route-response";
import { getSourceStatusResponse } from "@/lib/server/terrain-api";

export function GET() {
  return jsonRoute(() => getSourceStatusResponse());
}