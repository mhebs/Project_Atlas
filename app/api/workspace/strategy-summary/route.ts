import { NextResponse } from "next/server"
import { buildStrategySummary } from "@/lib/server/strategy-summary"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const summary = await buildStrategySummary()
    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build strategy summary" },
      { status: 500 },
    )
  }
}

