import { NextResponse } from "next/server"
import { isDebugResetError, runDebugReset } from "@/lib/server/debug-reset"
import type { DebugResetResponse } from "@/lib/atlas-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const result = await runDebugReset()
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run debug reset"
    const status = isDebugResetError(error) ? error.status : 500

    const payload: DebugResetResponse = {
      ok: false,
      mode: null,
      broker: null,
      filesReset: [],
      sessionsDeleted: 0,
      tradesLogCleared: false,
      wakeSchedulesCleared: false,
      warnings: [],
      error: message,
    }

    return NextResponse.json(payload, { status })
  }
}
