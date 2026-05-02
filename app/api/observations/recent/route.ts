import { NextResponse } from "next/server";
import { listObservations } from "@/lib/server/observation-store";

export async function GET() {
  const observations = await listObservations();
  return NextResponse.json(observations);
}