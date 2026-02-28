import fs from "node:fs/promises"
import path from "node:path"
import type { DebugResetBrokerSnapshot, DebugResetMode, DebugResetResponse } from "@/lib/atlas-types"
import { getRepoRoot, getSessionsDir, getWorkspaceRoot } from "./config"
import { loadRepoEnv } from "./env-loader"
import { buildResetMarkdownFiles, RESETTABLE_WORKSPACE_FILES, type ResettableWorkspaceFile } from "./reset-templates"

const ALPACA_PAPER_BASE_URL = "https://paper-api.alpaca.markets"
const LIQUIDATION_TIMEOUT_MS = 45_000
const POLL_INTERVAL_MS = 1_000

let resetInFlight = false

interface AlpacaContext {
  baseUrl: string
  headers: Record<string, string>
}

interface AlpacaClock {
  is_open: boolean
}

class DebugResetError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = "DebugResetError"
    this.status = status
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null
  const obj = payload as Record<string, unknown>
  if (typeof obj.message === "string") return obj.message
  if (typeof obj.error === "string") return obj.error
  return null
}

async function alpacaRequest(
  ctx: AlpacaContext,
  method: string,
  route: string,
): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(`${ctx.baseUrl}${route}`, {
      method,
      headers: ctx.headers,
      cache: "no-store",
    })
  } catch (error) {
    throw new DebugResetError(
      error instanceof Error ? error.message : "Failed to contact Alpaca API",
      502,
    )
  }

  const rawBody = await response.text()
  let payload: unknown = null
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = { message: rawBody }
    }
  }

  if (!response.ok) {
    const details = getErrorMessage(payload)
    throw new DebugResetError(
      details
        ? `Alpaca ${method} ${route} failed (${response.status}): ${details}`
        : `Alpaca ${method} ${route} failed (${response.status})`,
      response.status,
    )
  }

  return payload
}

function createAlpacaContext(repoRoot: string): AlpacaContext {
  const env = {
    ...process.env,
    ...loadRepoEnv(repoRoot),
  }

  const brokerType = (env.BROKER_TYPE || "alpaca").toLowerCase()
  if (brokerType !== "alpaca") {
    throw new DebugResetError(
      `Debug reset only supports BROKER_TYPE=alpaca (found '${brokerType}')`,
      400,
    )
  }

  if ((env.ALPACA_PAPER || "").toLowerCase() !== "true") {
    throw new DebugResetError(
      "Debug reset requires ALPACA_PAPER=true to avoid touching live accounts",
      400,
    )
  }

  const apiKey = env.ALPACA_API_KEY
  const secretKey = env.ALPACA_SECRET_KEY

  if (!apiKey || !secretKey) {
    throw new DebugResetError("Missing ALPACA_API_KEY or ALPACA_SECRET_KEY in repo .env", 400)
  }

  return {
    baseUrl: ALPACA_PAPER_BASE_URL,
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": secretKey,
      "Content-Type": "application/json",
    },
  }
}

async function getClock(ctx: AlpacaContext): Promise<AlpacaClock> {
  const payload = await alpacaRequest(ctx, "GET", "/v2/clock")
  if (!payload || typeof payload !== "object") {
    throw new DebugResetError("Unexpected Alpaca clock response", 502)
  }
  const clock = payload as AlpacaClock
  return { is_open: Boolean(clock.is_open) }
}

async function getPositions(ctx: AlpacaContext): Promise<DebugResetBrokerSnapshot["positions"]> {
  const payload = await alpacaRequest(ctx, "GET", "/v2/positions")
  if (!Array.isArray(payload)) {
    throw new DebugResetError("Unexpected Alpaca positions response", 502)
  }

  return payload.map((entry) => {
    const record = entry as Record<string, unknown>
    return {
      symbol: String(record.symbol ?? "").toUpperCase(),
      qty: toNumber(record.qty),
      avgEntryPrice: toNumber(record.avg_entry_price),
      currentPrice: toNumber(record.current_price),
      marketValue: toNumber(record.market_value),
      unrealizedPl: toNumber(record.unrealized_pl),
    }
  })
}

async function getBrokerSnapshot(
  ctx: AlpacaContext,
  marketOpen: boolean,
): Promise<DebugResetBrokerSnapshot> {
  const [accountPayload, positions] = await Promise.all([
    alpacaRequest(ctx, "GET", "/v2/account"),
    getPositions(ctx),
  ])

  if (!accountPayload || typeof accountPayload !== "object") {
    throw new DebugResetError("Unexpected Alpaca account response", 502)
  }

  const account = accountPayload as Record<string, unknown>
  const equity = toNumber(account.equity)
  const lastEquity = toNumber(account.last_equity)
  const dayPnl = lastEquity > 0 ? equity - lastEquity : null

  return {
    marketOpen,
    timestamp: new Date().toISOString(),
    equity,
    cash: toNumber(account.cash),
    buyingPower: toNumber(account.buying_power),
    dayPnl,
    positions,
  }
}

async function waitForNoPositions(ctx: AlpacaContext) {
  const deadline = Date.now() + LIQUIDATION_TIMEOUT_MS

  while (Date.now() < deadline) {
    const positions = await getPositions(ctx)
    if (positions.length === 0) return true
    await sleep(POLL_INTERVAL_MS)
  }

  return false
}

async function writeResetFiles(
  workspaceRoot: string,
  files: Record<ResettableWorkspaceFile, string>,
): Promise<string[]> {
  await Promise.all(
    RESETTABLE_WORKSPACE_FILES.map(async (fileName) => {
      const filePath = path.resolve(workspaceRoot, fileName)
      if (!filePath.startsWith(workspaceRoot)) {
        throw new DebugResetError(`Invalid workspace file path for ${fileName}`)
      }
      await fs.writeFile(filePath, files[fileName], "utf-8")
    }),
  )

  return [...RESETTABLE_WORKSPACE_FILES]
}

async function clearSessionFiles(sessionsDir: string) {
  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true })
    const targets = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(sessionsDir, entry.name))

    await Promise.all(targets.map((filePath) => fs.unlink(filePath)))
    return targets.length
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0
    throw error
  }
}

async function clearTradesLog(workspaceRoot: string) {
  const tradesLogPath = path.join(workspaceRoot, "trades.jsonl")
  await fs.writeFile(tradesLogPath, "", "utf-8")
  return true
}

export function isDebugResetError(error: unknown): error is DebugResetError {
  return error instanceof DebugResetError
}

export async function runDebugReset(): Promise<DebugResetResponse> {
  if (resetInFlight) {
    throw new DebugResetError("A debug reset is already in progress", 409)
  }

  resetInFlight = true

  try {
    const repoRoot = getRepoRoot()
    const workspaceRoot = getWorkspaceRoot()
    const sessionsDir = getSessionsDir()
    const ctx = createAlpacaContext(repoRoot)

    const warnings: string[] = []
    const clock = await getClock(ctx)

    let mode: DebugResetMode = "full"

    if (clock.is_open) {
      await alpacaRequest(ctx, "DELETE", "/v2/orders")
      await alpacaRequest(ctx, "DELETE", "/v2/positions")

      const fullyClosed = await waitForNoPositions(ctx)
      if (!fullyClosed) {
        throw new DebugResetError(
          `Timed out waiting ${LIQUIDATION_TIMEOUT_MS / 1000}s for positions to close`,
          502,
        )
      }
    } else {
      mode = "partial_market_closed"
      warnings.push("Market is closed, so broker liquidation was skipped.")
      warnings.push("Markdown reflects the actual broker snapshot at reset time.")
    }

    const snapshot = await getBrokerSnapshot(ctx, clock.is_open)

    if (mode === "full" && snapshot.positions.length > 0) {
      throw new DebugResetError("Broker positions are still open after liquidation attempt", 502)
    }

    const markdownFiles = buildResetMarkdownFiles(snapshot, mode, warnings)
    const filesReset = await writeResetFiles(workspaceRoot, markdownFiles)
    const sessionsDeleted = await clearSessionFiles(sessionsDir)
    const tradesLogCleared = await clearTradesLog(workspaceRoot)

    return {
      ok: true,
      mode,
      broker: snapshot,
      filesReset,
      sessionsDeleted,
      tradesLogCleared,
      warnings,
      error: null,
    }
  } finally {
    resetInFlight = false
  }
}
