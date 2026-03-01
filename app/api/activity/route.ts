import { NextRequest, NextResponse } from "next/server"
import { buildActivityFeed } from "@/lib/server/activity"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const kind = searchParams.get("kind") || "all"
    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined

    const data = await buildActivityFeed({ kind, from, to })
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load activity"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
