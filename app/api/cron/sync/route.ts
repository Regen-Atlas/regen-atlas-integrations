/**
 * Vercel Cron endpoint - sync connector data
 *
 * GET /api/cron/sync?connector=atlantis&chain=arbitrum
 *
 * Validates User-Agent: vercel-cron/1.0
 * Optional: CRON_SECRET in Authorization header
 */

import { NextRequest, NextResponse } from "next/server";
import { runSync } from "../../../../src/core/runner";

export const maxDuration = 300; // 5 min (Hobby) or 800 on Pro
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Validate Vercel cron
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent.startsWith("vercel-cron/")) {
    return NextResponse.json(
      { error: "Unauthorized - invalid user agent" },
      { status: 401 }
    );
  }

  // Optional: CRON_SECRET for extra security
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    const token = auth?.replace(/^Bearer\s+/i, "").trim();
    if (token !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized - invalid CRON_SECRET" },
        { status: 401 }
      );
    }
  }

  const connector = request.nextUrl.searchParams.get("connector");
  const chain = request.nextUrl.searchParams.get("chain") ?? undefined;

  if (!connector) {
    return NextResponse.json(
      { error: "Missing required query param: connector" },
      { status: 400 }
    );
  }

  try {
    const stats = await runSync({
      connectorId: connector,
      scope: chain ? { chain } : undefined,
      dryRun: false,
    });

    return NextResponse.json({
      success: true,
      successCount: stats.successCount,
      skipCount: stats.skipCount,
      errorCount: stats.errorCount,
    });
  } catch (error) {
    console.error("Cron sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
