import { NextResponse } from "next/server"
import { buildStrategySummary } from "@/lib/server/strategy-summary"
import { readStrategyConfirmed } from "@/lib/server/workspace-files"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [summary, { confirmed }] = await Promise.all([
      buildStrategySummary(),
      readStrategyConfirmed(),
    ])
    return NextResponse.json({ ...summary, confirmed })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build strategy summary" },
      { status: 500 },
    )
  }
}

