import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { getSessionsDir } from "@/lib/server/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, questionId, answers } = body as {
      sessionId?: string
      questionId?: string
      answers?: Record<string, string>
    }

    if (!sessionId || !questionId || !answers) {
      return NextResponse.json(
        { error: "sessionId, questionId, and answers are required" },
        { status: 400 },
      )
    }

    const sessionsDir = getSessionsDir()
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`)

    // Validate the session file exists
    try {
      await fs.access(sessionPath)
    } catch {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      )
    }

    // Read and validate session state
    const raw = JSON.parse(await fs.readFile(sessionPath, "utf-8")) as {
      status?: string
      pendingQuestion?: { id?: string } | null
    }

    if (raw.status !== "awaiting_input") {
      return NextResponse.json(
        { error: "Session is not awaiting input" },
        { status: 409 },
      )
    }

    if (raw.pendingQuestion?.id !== questionId) {
      return NextResponse.json(
        { error: "Question ID does not match pending question" },
        { status: 409 },
      )
    }

    // Write the sidecar answer file for the agent to pick up
    const answerPath = path.join(sessionsDir, `${sessionId}.answer.json`)
    await fs.writeFile(
      answerPath,
      JSON.stringify({
        questionId,
        answers,
        answeredAt: new Date().toISOString(),
      }),
      "utf-8",
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit answer" },
      { status: 500 },
    )
  }
}
