import { NextResponse } from "next/server"
import { spawn } from "child_process"
import { readFileSync } from "fs"
import path from "path"
import { getRepoRoot } from "@/lib/server/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_MESSAGE_LENGTH = 2000

/**
 * Parse the workspace .env file so the spawned agent process
 * gets vars like LLM_API_KEY that Next.js doesn't load.
 */
function loadWorkspaceEnv(repoRoot: string): Record<string, string> {
  try {
    const raw = readFileSync(path.join(repoRoot, ".env"), "utf-8")
    const vars: Record<string, string> = {}
    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (key) vars[key] = value
    }
    return vars
  } catch {
    return {}
  }
}

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
    const envVars = { ...process.env, ...loadWorkspaceEnv(repoRoot) }

    // Spawn detached so the agent outlives this request
    const child = spawn("node", [agentScript, "--once", `--trigger=${message}`], {
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
