import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "SherpAI radio ingestion is disabled until a real speech-to-structure pipeline is configured for the TypeScript-only deployment.",
    },
    { status: 501 },
  );
}