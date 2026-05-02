import "server-only";

import { NextResponse } from "next/server";

export async function jsonRoute<T>(loader: () => Promise<T> | T) {
  try {
    return NextResponse.json(await loader());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected API error",
      },
      { status: 503 },
    );
  }
}