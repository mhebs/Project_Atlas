"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
  ActivityResponse,
  ActivityDay,
  ActivityEvent,
  ActivityEventKind,
  SessionActivityEvent,
  TradeActivityEvent,
  WakeAuditActivityEvent,
} from "@/lib/atlas-types"

/* ------------------------------------------------------------------ */
/*  Filter config                                                      */
/* ------------------------------------------------------------------ */

type FilterKind = "all" | ActivityEventKind

const filters: { label: string; value: FilterKind }[] = [
  { label: "All", value: "all" },
  { label: "Sessions", value: "session" },
  { label: "Trades", value: "trade" },
  { label: "Rules", value: "wake_audit" },
]

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

function fmtTime(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return ""
  }
}

function fmtDuration(ms: number | null): string {
  if (ms === null) return "—"
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return `${mins}m ${rem}s`
}

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ------------------------------------------------------------------ */
/*  Accent colors                                                      */
/* ------------------------------------------------------------------ */

function sessionAccent(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500"
    case "running":
      return "bg-amber-400"
    case "error":
      return "bg-red-400"
    default:
      return "bg-[var(--muted-foreground)]"
  }
}

function sessionDot(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500"
    case "running":
      return "bg-amber-400 animate-pulse"
    case "error":
      return "bg-red-400"
    default:
      return "bg-[var(--muted-foreground)]"
  }
}

function tradeAccent(result: string): string {
  switch (result) {
    case "submitted":
      return "bg-emerald-500"
    case "blocked":
      return "bg-red-400"
    case "awaiting_confirmation":
      return "bg-amber-400"
    default:
      return "bg-[var(--muted-foreground)]"
  }
}

function tradeBadgeStyle(result: string): string {
  switch (result) {
    case "submitted":
      return "bg-emerald-500/15 text-emerald-400"
    case "blocked":
      return "bg-red-400/15 text-red-400"
    case "awaiting_confirmation":
      return "bg-amber-400/15 text-amber-400"
    default:
      return "bg-[var(--muted)]/50 text-[var(--muted-foreground)]"
  }
}

function auditAccent(auditType: string): string {
  if (auditType.includes("triggered") || auditType.includes("rule")) {
    return "bg-amber-400"
  }
  return "bg-[var(--muted-foreground)]/50"
}

/* ------------------------------------------------------------------ */
/*  Event cards                                                        */
/* ------------------------------------------------------------------ */

function SessionCard({ event }: { event: SessionActivityEvent }) {
  return (
    <div className="activity-card bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="flex">
        <div className={`w-1 shrink-0 ${sessionAccent(event.status)}`} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                  session
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                  {event.trigger}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${sessionDot(event.status)}`} />
                  <span className="text-sm font-medium text-[var(--foreground)] capitalize">
                    {event.status}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)]">·</span>
                <span className="text-xs font-mono text-[var(--muted-foreground)]">
                  {fmtDuration(event.durationMs)}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)]">·</span>
                <span className="text-xs font-mono text-[var(--muted-foreground)]">
                  {event.messageCount} msg{event.messageCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] whitespace-nowrap shrink-0 pt-0.5">
              {fmtTime(event.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TradeCard({ event }: { event: TradeActivityEvent }) {
  return (
    <div className="activity-card bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="flex">
        <div className={`w-1 shrink-0 ${tradeAccent(event.result)}`} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                  trade
                </span>
                <span
                  className={`text-[10px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded ${tradeBadgeStyle(event.result)}`}
                >
                  {event.result.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-mono font-semibold text-[var(--foreground)] tracking-wide">
                  {event.symbol}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] uppercase">
                  {event.side} {event.qty}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-mono text-[var(--muted-foreground)]">
                  @ {fmtUsd(event.estimatedPrice)}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)]">·</span>
                <span className="text-xs font-mono text-[var(--muted-foreground)]">
                  {fmtUsd(event.estimatedValue)}
                </span>
              </div>
              {event.reason && (
                <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed border-t border-[var(--border)] pt-2">
                  {event.reason}
                </p>
              )}
            </div>
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] whitespace-nowrap shrink-0 pt-0.5">
              {fmtTime(event.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WakeAuditCard({ event }: { event: WakeAuditActivityEvent }) {
  return (
    <div className="activity-card bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="flex">
        <div className={`w-1 shrink-0 ${auditAccent(event.auditType)}`} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded bg-amber-400/10 text-amber-400">
                  {event.auditType.replace(/[._]/g, " ")}
                </span>
              </div>
              {event.summary && (
                <p className="text-sm text-[var(--foreground)] leading-relaxed">
                  {event.summary}
                </p>
              )}
              <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1.5">
                actor: {event.actor}
              </p>
            </div>
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] whitespace-nowrap shrink-0 pt-0.5">
              {fmtTime(event.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EventCard({ event }: { event: ActivityEvent }) {
  switch (event.kind) {
    case "session":
      return <SessionCard event={event} />
    case "trade":
      return <TradeCard event={event} />
    case "wake_audit":
      return <WakeAuditCard event={event} />
  }
}

/* ------------------------------------------------------------------ */
/*  Day group                                                          */
/* ------------------------------------------------------------------ */

function DayGroup({ day, index }: { day: ActivityDay; index: number }) {
  return (
    <div
      className="activity-day-group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Date separator */}
      <div className="flex items-center gap-4 py-4">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono tracking-[0.15em] text-[var(--muted-foreground)]">
            {day.label}
          </span>
          <span className="text-[10px] font-mono text-[var(--muted-foreground)]/50">
            ({day.events.length})
          </span>
        </div>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* Events */}
      <div className="flex flex-col gap-2.5">
        {day.events.map((event, i) => (
          <div
            key={event.id}
            className="activity-card-enter"
            style={{ animationDelay: `${index * 80 + i * 40}ms` }}
          >
            <EventCard event={event} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                        */
/* ------------------------------------------------------------------ */

export function ActivityScreen() {
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKind>("all")
  const mountedRef = useRef(true)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const params = filter !== "all" ? `?kind=${filter}` : ""
        const response = await fetch(`/api/activity${params}`, {
          cache: "no-store",
        })
        const json = await response.json()
        if (!response.ok)
          throw new Error(json.error || "Failed to load activity")
        if (!mountedRef.current) return
        setData(json as ActivityResponse)
        setError(null)
      } catch (e) {
        if (!mountedRef.current) return
        setError(e instanceof Error ? e.message : "Failed to load activity")
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    },
    [filter],
  )

  useEffect(() => {
    mountedRef.current = true
    void load()
    const interval = setInterval(() => void load(true), 5000)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [load])

  const hasEvents = data && data.days.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-2">
        <h2 className="font-serif text-2xl text-[var(--foreground)]">
          Activity
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {"Meridian's execution log"}
        </p>
      </div>

      {/* Filter pills */}
      <div className="px-6 md:px-8 py-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 text-xs font-mono rounded-md border transition-colors cursor-pointer ${
                filter === f.value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30"
              }`}
            >
              {f.label}
            </button>
          ))}

          {data && (
            <span className="flex items-center text-[10px] font-mono text-[var(--muted-foreground)]/60 ml-2">
              {data.totalEvents} event{data.totalEvents !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-6 md:mx-8 mt-1 rounded-md border border-red-400/20 bg-red-400/5 px-4 py-2">
          <p className="text-xs font-mono text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
        {loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] animate-pulse" />
              <span className="text-xs font-mono text-[var(--muted-foreground)]">
                Loading activity...
              </span>
            </div>
          </div>
        ) : hasEvents ? (
          <div className="max-w-3xl">
            {data!.days.map((day, i) => (
              <DayGroup key={day.date} day={day} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No activity recorded yet.
              </p>
              <p className="text-xs text-[var(--muted-foreground)]/50 mt-1 font-mono">
                Events will appear here as Meridian operates.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .activity-day-group {
          animation: dayFadeIn 0.4s ease-out both;
        }
        .activity-card-enter {
          animation: cardSlideUp 0.35s ease-out both;
        }
        .activity-card {
          transition: border-color 0.15s ease;
        }
        .activity-card:hover {
          border-color: color-mix(in srgb, var(--primary) 25%, var(--border));
        }
        @keyframes dayFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
