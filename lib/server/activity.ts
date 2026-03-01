import fs from "node:fs/promises"
import path from "node:path"
import type {
  ActivityEvent,
  ActivityDay,
  ActivityResponse,
  SessionActivityEvent,
  TradeActivityEvent,
  WakeAuditActivityEvent,
} from "@/lib/atlas-types"
import { getWorkspaceRoot, getSessionsDir } from "./config"

/* ------------------------------------------------------------------ */
/*  Raw file types                                                     */
/* ------------------------------------------------------------------ */

interface RawTrade {
  timestamp: string
  date?: string
  symbol: string
  side: string
  qty: number
  order_type: string
  estimated_price: number
  estimated_value: number
  result: string
  reason?: string
  order_id?: string
}

interface RawWakeAudit {
  ts?: string
  timestamp?: string
  type?: string
  actor?: string
  summary?: string
  [key: string]: unknown
}

interface RawSession {
  id?: string
  trigger?: string
  startedAt?: string
  endedAt?: string
  status?: "running" | "completed" | "error"
  error?: string
  messages?: unknown[]
}

/* ------------------------------------------------------------------ */
/*  JSONL reader                                                       */
/* ------------------------------------------------------------------ */

async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return content
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
}

/* ------------------------------------------------------------------ */
/*  Data source readers                                                */
/* ------------------------------------------------------------------ */

async function readTrades(): Promise<TradeActivityEvent[]> {
  const filePath = path.join(getWorkspaceRoot(), "trades.jsonl")
  const raw = await readJsonl<RawTrade>(filePath)

  return raw.map((t, i) => ({
    kind: "trade" as const,
    id: `trade-${i}`,
    timestamp: t.timestamp,
    symbol: t.symbol,
    side: t.side,
    qty: t.qty,
    orderType: t.order_type,
    estimatedPrice: t.estimated_price,
    estimatedValue: t.estimated_value,
    result: t.result,
    reason: t.reason || null,
    orderId: t.order_id || null,
  }))
}

async function readWakeAudit(): Promise<WakeAuditActivityEvent[]> {
  const filePath = path.join(getWorkspaceRoot(), "WAKE_AUDIT.jsonl")
  const raw = await readJsonl<RawWakeAudit>(filePath)

  return raw.map((a, i) => {
    const { ts, timestamp, type, actor, summary, ...rest } = a
    return {
      kind: "wake_audit" as const,
      id: `audit-${i}`,
      timestamp: ts || timestamp || new Date(0).toISOString(),
      auditType: type || "unknown",
      actor: actor || "system",
      summary: summary || "",
      metadata: rest as Record<string, unknown>,
    }
  })
}

async function readSessionSummaries(): Promise<SessionActivityEvent[]> {
  const sessionsDir = getSessionsDir()

  let entries: string[]
  try {
    entries = await fs.readdir(sessionsDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }

  const jsonFiles = entries.filter((name) => name.endsWith(".json"))

  const sessions = await Promise.all(
    jsonFiles.map(async (name) => {
      try {
        const filePath = path.join(sessionsDir, name)
        const content = await fs.readFile(filePath, "utf-8")
        const raw = JSON.parse(content) as RawSession

        const startedAt = raw.startedAt || ""
        const endedAt = raw.endedAt || null
        const durationMs =
          startedAt && endedAt
            ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
            : null

        return {
          kind: "session" as const,
          id: `session-${raw.id || path.basename(name, ".json")}`,
          timestamp: startedAt,
          sessionId: raw.id || path.basename(name, ".json"),
          trigger: raw.trigger || "unknown",
          startedAt,
          endedAt,
          status: raw.status || ("running" as const),
          messageCount: Array.isArray(raw.messages) ? raw.messages.length : 0,
          durationMs,
        } satisfies SessionActivityEvent
      } catch {
        return null
      }
    }),
  )

  return sessions.filter((s): s is SessionActivityEvent => s !== null)
}

/* ------------------------------------------------------------------ */
/*  Day grouping                                                       */
/* ------------------------------------------------------------------ */

function getDayLabel(dateStr: string): string {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (dateStr === todayStr) return "Today"
  if (dateStr === yesterdayStr) return "Yesterday"

  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function groupByDay(events: ActivityEvent[]): ActivityDay[] {
  const map = new Map<string, ActivityEvent[]>()

  for (const event of events) {
    const date = event.timestamp.slice(0, 10)
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(event)
  }

  const days: ActivityDay[] = []
  for (const [date, dayEvents] of map) {
    days.push({
      date,
      label: getDayLabel(date),
      events: dayEvents,
    })
  }

  return days.sort((a, b) => b.date.localeCompare(a.date))
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function buildActivityFeed(opts: {
  kind?: string
  from?: string
  to?: string
}): Promise<ActivityResponse> {
  const { kind = "all", from, to } = opts

  const [trades, audits, sessions] = await Promise.all([
    kind === "all" || kind === "trade" ? readTrades() : Promise.resolve([]),
    kind === "all" || kind === "wake_audit" ? readWakeAudit() : Promise.resolve([]),
    kind === "all" || kind === "session" ? readSessionSummaries() : Promise.resolve([]),
  ])

  let allEvents: ActivityEvent[] = [...trades, ...audits, ...sessions]

  // Date range filter
  if (from) {
    allEvents = allEvents.filter((e) => e.timestamp >= from)
  }
  if (to) {
    allEvents = allEvents.filter((e) => e.timestamp <= to)
  }

  // Sort descending by timestamp
  allEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const days = groupByDay(allEvents)

  return {
    days,
    totalEvents: allEvents.length,
    filters: { kind },
  }
}
