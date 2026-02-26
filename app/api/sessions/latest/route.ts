import { NextResponse } from "next/server"
import { getLatestSessionSnapshot } from "@/lib/server/sessions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const snapshot = await getLatestSessionSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load latest session" },
      { status: 500 },
    )
  }
}

