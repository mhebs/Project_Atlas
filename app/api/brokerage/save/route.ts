import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getRepoRoot } from "@/lib/server/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await request.json()
  const { apiKey, secretKey } = body as { apiKey?: string; secretKey?: string }

  if (!apiKey || !secretKey) {
    return NextResponse.json({ ok: false, error: "Credentials required" }, { status: 400 })
  }

  const repoRoot = getRepoRoot()
  const envPath = path.join(repoRoot, ".env")

  let content = ""
  try {
    content = fs.readFileSync(envPath, "utf-8")
  } catch {
    /* file may not exist yet */
  }

  const lines = content.split("\n")
  const updates: Record<string, string> = {
    ALPACA_API_KEY: apiKey,
    ALPACA_SECRET_KEY: secretKey,
    ALPACA_PAPER: "true",
    BROKER_TYPE: "alpaca",
  }

  const seen = new Set<string>()
  const newLines = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return line
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) return line
    const key = trimmed.slice(0, eqIdx).trim()
    if (key in updates) {
      seen.add(key)
      return `${key}=${updates[key]}`
    }
    return line
  })

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      newLines.push(`${key}=${value}`)
    }
  }

  fs.writeFileSync(envPath, newLines.join("\n"), "utf-8")

  return NextResponse.json({ ok: true })
}
