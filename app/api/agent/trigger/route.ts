import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import { getRepoRoot } from "@/lib/server/config"
import { getLatestSessionFile, readSessionSnapshot } from "@/lib/server/sessions"
import { loadRepoEnv } from "@/lib/server/env-loader"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
        { status: 400 },
      )
    }

    const repoRoot = getRepoRoot()
    const agentScript = path.join(repoRoot, "packages", "agent", "dist", "index.js")
    const envVars = { ...process.env, ...loadRepoEnv(repoRoot) }

    // Check for a recent completed session to continue the conversation
    const agentArgs = [agentScript, "--once", `--trigger=${message}`]
    try {
      const latestFile = await getLatestSessionFile()
      if (latestFile) {
        const snapshot = await readSessionSnapshot(latestFile.filePath, latestFile.mtimeMs)
        if (snapshot.sessionId && snapshot.status === "completed") {
          agentArgs.push(`--continue-session=${snapshot.sessionId}`)
        }
      }
    } catch {
      // Non-fatal: if we can't read the latest session, just start fresh
    }

    // Spawn detached so the agent outlives this request
    const child = spawn("node", agentArgs, {
      cwd: repoRoot,
      detached: true,
      stdio: "ignore",
      env: envVars,
    })

    child.unref()

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger agent" },
      { status: 500 },
    )
  }
}
