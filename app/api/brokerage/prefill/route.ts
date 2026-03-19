import { NextResponse } from "next/server"
import { getRepoRoot } from "@/lib/server/config"
import { loadRepoEnv } from "@/lib/server/env-loader"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const repoRoot = getRepoRoot()
  const env = loadRepoEnv(repoRoot)

  const apiKey = env.ALPACA_API_KEY || ""
  const secretKey = env.ALPACA_SECRET_KEY || ""

  return NextResponse.json({
    apiKey,
    secretKey,
    hasExisting: !!(apiKey && secretKey),
  })
}
