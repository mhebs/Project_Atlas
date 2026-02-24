"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

type ActivityType = "trade" | "analysis" | "alert" | "system"

interface ActivityEntry {
  id: number
  type: ActivityType
  title: string
  detail: string
  reasoning: string
  guardrail?: string
  expandedDetails?: string
  timestamp: string
}

const activities: ActivityEntry[] = [
  {
    id: 1,
    type: "trade",
    title: "Trade Executed",
    detail: "AAPL — Opened 25 shares",
    reasoning:
      "Price retraced to defined entry band within growth allocation strategy.",
    guardrail: "Drawdown risk within acceptable range.",
    expandedDetails:
      "Entry price: $182.14. Order type: Market. Allocation: 18.2% of portfolio. Strategy alignment: Long-term growth core position.",
    timestamp: "2026-02-24 14:32:07",
  },
  {
    id: 2,
    type: "analysis",
    title: "Market Analysis",
    detail: "Weekly sector rotation review completed",
    reasoning:
      "Technology sector continues to show relative strength against broader market indices. Maintaining current allocation.",
    expandedDetails:
      "Sectors reviewed: Technology, Healthcare, Financials, Energy, Consumer Discretionary. No rebalancing triggered.",
    timestamp: "2026-02-24 09:15:00",
  },
  {
    id: 3,
    type: "trade",
    title: "Trade Executed",
    detail: "MSFT — Opened 10 shares",
    reasoning:
      "Earnings beat consensus estimates. Position initiated within diversified tech allocation framework.",
    guardrail: "Position size within 12% single-stock limit.",
    expandedDetails:
      "Entry price: $412.55. Order type: Limit. Allocation: 16.6% of portfolio. Strategy alignment: Growth with quality bias.",
    timestamp: "2026-02-23 11:44:22",
  },
  {
    id: 4,
    type: "alert",
    title: "Risk Alert",
    detail: "Portfolio drawdown approaching 5% threshold",
    reasoning:
      "Current drawdown at 4.8%. Monitoring closely. No action required at this level per strategy parameters.",
    expandedDetails:
      "Peak value: $25,104. Current value: $23,899. Drawdown: 4.8%. Guardrail trigger: 15%. Status: Within tolerance.",
    timestamp: "2026-02-22 16:00:00",
  },
  {
    id: 5,
    type: "system",
    title: "System Update",
    detail: "Strategy parameters updated",
    reasoning:
      "User confirmed long-term growth strategy with 15% max drawdown guardrail. Parameters locked.",
    expandedDetails:
      "Strategy: Long-Term Growth. Risk cap: 15% max drawdown. Capital allocated: $25,000. Status: Active.",
    timestamp: "2026-02-21 10:22:15",
  },
  {
    id: 6,
    type: "trade",
    title: "Trade Executed",
    detail: "SPY — Opened 15 shares",
    reasoning:
      "Broad market index position to maintain baseline equity exposure while sector-specific analysis continues.",
    guardrail: "Core index allocation within defined parameters.",
    expandedDetails:
      "Entry price: $498.22. Order type: Market. Allocation: 30.1% of portfolio. Strategy alignment: Core index holding.",
    timestamp: "2026-02-20 13:08:44",
  },
]

const filters: { label: string; value: ActivityType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Trades", value: "trade" },
  { label: "Analysis", value: "analysis" },
  { label: "Alerts", value: "alert" },
  { label: "System", value: "system" },
]

const typeColors: Record<ActivityType, string> = {
  trade: "bg-primary text-primary-foreground",
  analysis: "bg-muted text-foreground",
  alert: "bg-secondary text-secondary-foreground",
  system: "bg-muted text-foreground",
}

const accentColors: Record<ActivityType, string> = {
  trade: "bg-primary",
  analysis: "bg-muted-foreground",
  alert: "bg-secondary",
  system: "bg-border",
}

function ActivityCard({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex">
        {/* Left accent bar */}
        <div className={`w-1 shrink-0 ${accentColors[entry.type]}`} />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${typeColors[entry.type]}`}
                >
                  {entry.type}
                </span>
              </div>
              <h4 className="text-sm font-medium text-foreground">
                {entry.detail}
              </h4>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {entry.reasoning}
              </p>
              {entry.guardrail && (
                <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                  Guardrail check: {entry.guardrail}
                </p>
              )}

              {expanded && entry.expandedDetails && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {entry.expandedDetails}
                  </p>
                </div>
              )}

              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Hide details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>View details</span>
                  </>
                )}
              </button>
            </div>

            <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
              {entry.timestamp.split(" ")[1]}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActivityScreen() {
  const [filter, setFilter] = useState<ActivityType | "all">("all")

  const filtered =
    filter === "all"
      ? activities
      : activities.filter((a) => a.type === filter)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-2">
        <h2 className="font-serif text-2xl text-foreground">Agent Activity</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {"Meridian's execution log."}
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
                filter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <ActivityCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  )
}
