import { NextResponse } from "next/server";
import { saveObservation } from "@/lib/server/observation-store";
import type { FieldObservation } from "@/types/terrain";

interface SubmissionPayload {
  observation: FieldObservation;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SubmissionPayload;

  if (!payload.observation?.id || !payload.observation.zoneId || !payload.observation.title) {
    return NextResponse.json({ error: "Invalid observation payload" }, { status: 400 });
  }

  const observation = await saveObservation(payload.observation);
  return NextResponse.json({ observation, status: "saved" });
}