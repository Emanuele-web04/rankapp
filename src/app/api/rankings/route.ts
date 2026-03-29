// FILE: route.ts
// Purpose: Exposes app ranking data to the frontend as a lightweight JSON endpoint.
// Layer: App Router API route
// Exports: GET
// Depends on: src/lib/app-store.ts

import { NextResponse } from "next/server";

import { getAppRankings } from "@/lib/app-store";

// ─── ENTRY POINT ─────────────────────────────────────────────

// Validates the query string and returns storefront rankings for one app.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appQuery = searchParams.get("app")?.trim();

  if (!appQuery) {
    return NextResponse.json({ error: "Missing ?app= query parameter." }, { status: 400 });
  }

  try {
    const payload = await getAppRankings(appQuery);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load rankings right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

