import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "SherpAI draft generation is disabled until a real AI provider is configured for the TypeScript-only deployment.",
    },
    { status: 501 },
  );
}