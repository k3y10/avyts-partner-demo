import { jsonRoute } from "@/lib/server/route-response";
import { getTerrainCellResponse } from "@/lib/server/terrain-api";

export async function GET(_request: Request, context: { params: Promise<{ cellId: string }> }) {
  const { cellId } = await context.params;
  return jsonRoute(() => getTerrainCellResponse(cellId));
}