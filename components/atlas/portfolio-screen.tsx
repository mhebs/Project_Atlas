"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { WorkspaceDoc } from "@/lib/atlas-types"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PortfolioOverview {
  equity: number
  cash: number
  buyingPower: number
  dayPnl: string
  updated: string
}

interface Holding {
  symbol: string
  qty: number
  avgCost: number
  price: number
  value: number
  pnl: number
  weight: number
}

interface PortfolioData {
  overview: PortfolioOverview
  holdings: Holding[]
}

/* ------------------------------------------------------------------ */
/*  Markdown parser — extracts structured data from PORTFOLIO.md       */
/* ------------------------------------------------------------------ */

function parseCurrency(raw: string): number {
  return parseFloat(raw.replace(/[$,~]/g, "")) || 0
}

function parsePortfolio(md: string): PortfolioData | null {
  try {
    const overview: PortfolioOverview = {
      equity: 0,
      cash: 0,
      buyingPower: 0,
      dayPnl: "N/A",
      updated: "",
    }

    // Extract updated date
    const updatedMatch = md.match(/\*\*Updated\*\*:\s*(.+)/)
    if (updatedMatch) overview.updated = updatedMatch[1].trim()

    // Extract overview fields
    const equityMatch = md.match(/\*\*Equity\*\*:\s*\$([0-9,.]+)/)
    if (equityMatch) overview.equity = parseCurrency(equityMatch[1])

    const cashMatch = md.match(/\*\*Cash\*\*:\s*([-$0-9,.]+)/)
    if (cashMatch) overview.cash = parseCurrency(cashMatch[1])

    const bpMatch = md.match(/\*\*Buying Power\*\*:\s*\$([0-9,.]+)/)
    if (bpMatch) overview.buyingPower = parseCurrency(bpMatch[1])

    const dayMatch = md.match(/\*\*Day P&L\*\*:\s*(.+)/)
    if (dayMatch) overview.dayPnl = dayMatch[1].trim()

    // Parse holdings table
    const holdings: Holding[] = []
    const tableLines = md.split("\n").filter((l) => l.startsWith("|"))
    // skip header + separator rows
    for (let i = 2; i < tableLines.length; i++) {
      const cols = tableLines[i]
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
      if (cols.length >= 7) {
        holdings.push({
          symbol: cols[0],
          qty: parseInt(cols[1], 10) || 0,
          avgCost: parseCurrency(cols[2]),
          price: parseCurrency(cols[3]),
          value: parseCurrency(cols[4]),
          pnl: parseCurrency(cols[5].replace("+", "")),
          weight: parseFloat(cols[6].replace("%", "")) || 0,
        })
      }
    }

    return { overview, holdings }
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

function fmtUsd(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtPnl(n: number): string {
  const sign = n >= 0 ? "+" : ""
  return `${sign}${fmtUsd(n)}`
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function EquityHero({ overview }: { overview: PortfolioOverview }) {
  return (
    <div className="portfolio-hero">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Total Equity
        </span>
        {overview.updated && (
          <span className="text-[10px] font-mono text-[var(--muted-foreground)]/60">
            {overview.updated}
          </span>
        )}
      </div>
      <p className="text-[2.75rem] md:text-[3.5rem] font-mono font-medium tracking-tight text-[var(--foreground)] leading-none">
        {fmtUsd(overview.equity)}
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 pt-5 border-t border-[var(--border)]">
        <StatChip label="Cash" value={fmtUsd(overview.cash)} negative={overview.cash < 0} />
        <StatChip label="Buying Power" value={fmtUsd(overview.buyingPower)} />
        <StatChip label="Day P&L" value={overview.dayPnl} />
      </div>
    </div>
  )
}

function StatChip({
  label,
  value,
  negative = false,
}: {
  label: string
  value: string
  negative?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
        {label}
      </span>
      <span
        className={`text-sm font-mono font-medium ${
          negative ? "text-[var(--loss)]" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Holdings table                                                     */
/* ------------------------------------------------------------------ */

function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const maxWeight = Math.max(...holdings.map((h) => h.weight), 1)

  return (
    <div className="holdings-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Holdings
        </h3>
        <span className="text-[10px] font-mono text-[var(--muted-foreground)]/60">
          {holdings.length} position{holdings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Symbol", "Qty", "Avg Cost", "Price", "Value", "P&L", "Weight"].map(
                (col, i) => (
                  <th
                    key={col}
                    className={`pb-3 text-[10px] font-mono font-normal uppercase tracking-[0.15em] text-[var(--muted-foreground)] ${
                      i === 0 ? "text-left pr-4" : "text-right pl-4"
                    }`}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, idx) => (
              <tr
                key={h.symbol}
                className="group border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--muted)]/30 transition-colors"
                style={{
                  animationDelay: `${idx * 60}ms`,
                }}
              >
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-mono font-bold text-[var(--primary-foreground)] leading-none">
                        {h.symbol.slice(0, 2)}
                      </span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-[var(--foreground)] tracking-wide">
                      {h.symbol}
                    </span>
                  </div>
                </td>
                <td className="py-4 pl-4 text-right font-mono text-sm text-[var(--foreground)]">
                  {h.qty}
                </td>
                <td className="py-4 pl-4 text-right font-mono text-sm text-[var(--muted-foreground)]">
                  {fmtUsd(h.avgCost)}
                </td>
                <td className="py-4 pl-4 text-right font-mono text-sm text-[var(--foreground)]">
                  {fmtUsd(h.price)}
                </td>
                <td className="py-4 pl-4 text-right font-mono text-sm font-medium text-[var(--foreground)]">
                  {fmtUsd(h.value)}
                </td>
                <td
                  className={`py-4 pl-4 text-right font-mono text-sm font-medium ${
                    h.pnl >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"
                  }`}
                >
                  {fmtPnl(h.pnl)}
                </td>
                <td className="py-4 pl-4">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${(h.weight / maxWeight) * 100}%`,
                          backgroundColor: "var(--secondary)",
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[var(--muted-foreground)] w-11 text-right tabular-nums">
                      {h.weight.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals row */}
        <div className="flex items-center justify-between pt-4 mt-1 border-t-2 border-[var(--foreground)]/10">
          <span className="text-xs font-mono uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            Total
          </span>
          <div className="flex items-center gap-8">
            <span className="text-sm font-mono font-semibold text-[var(--foreground)]">
              {fmtUsd(holdings.reduce((s, h) => s + h.value, 0))}
            </span>
            <span
              className={`text-sm font-mono font-semibold ${
                holdings.reduce((s, h) => s + h.pnl, 0) >= 0
                  ? "text-[var(--gain)]"
                  : "text-[var(--loss)]"
              }`}
            >
              {fmtPnl(holdings.reduce((s, h) => s + h.pnl, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {holdings.map((h, idx) => (
          <div
            key={h.symbol}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 portfolio-card-enter"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center">
                  <span className="text-[9px] font-mono font-bold text-[var(--primary-foreground)]">
                    {h.symbol.slice(0, 2)}
                  </span>
                </div>
                <span className="text-sm font-mono font-semibold text-[var(--foreground)] tracking-wide">
                  {h.symbol}
                </span>
              </div>
              <span
                className={`text-sm font-mono font-semibold ${
                  h.pnl >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"
                }`}
              >
                {fmtPnl(h.pnl)}
              </span>
            </div>

            {/* Weight bar */}
            <div className="mb-3">
              <div className="w-full h-1 rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${h.weight}%`,
                    backgroundColor: "var(--secondary)",
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--muted-foreground)] mt-1 block">
                {h.weight.toFixed(1)}% of portfolio
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <MobileStat label="Qty" value={String(h.qty)} />
              <MobileStat label="Avg Cost" value={fmtUsd(h.avgCost)} />
              <MobileStat label="Price" value={fmtUsd(h.price)} />
              <MobileStat label="Value" value={fmtUsd(h.value)} />
            </div>
          </div>
        ))}

        {/* Mobile total */}
        <div className="flex items-center justify-between px-1 pt-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            Total
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono font-semibold text-[var(--foreground)]">
              {fmtUsd(holdings.reduce((s, h) => s + h.value, 0))}
            </span>
            <span
              className={`text-sm font-mono font-semibold ${
                holdings.reduce((s, h) => s + h.pnl, 0) >= 0
                  ? "text-[var(--gain)]"
                  : "text-[var(--loss)]"
              }`}
            >
              {fmtPnl(holdings.reduce((s, h) => s + h.pnl, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="text-sm font-mono text-[var(--foreground)]">{value}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main portfolio screen                                              */
/* ------------------------------------------------------------------ */

export function PortfolioScreen() {
  const [doc, setDoc] = useState<WorkspaceDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await fetch(
        `/api/workspace/file?name=${encodeURIComponent("PORTFOLIO.md")}`,
        { cache: "no-store" }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to load portfolio")
      if (!mountedRef.current) return
      setDoc(data as WorkspaceDoc)
      setError(null)
    } catch (e) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e.message : "Failed to load portfolio")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void load()
    const interval = setInterval(() => void load(true), 5000)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [load])

  const portfolioData = doc?.content ? parsePortfolio(doc.content) : null

  return (
    <div className="flex h-full flex-col">
      {/* Minimal header */}
      <div className="px-6 md:px-8 pt-6 pb-2 flex items-center justify-between">
        <h2 className="font-serif text-2xl text-[var(--foreground)]">Portfolio</h2>
        <button
          onClick={() => void load()}
          className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30 transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-6 md:mx-8 mt-2 rounded-md border border-[var(--loss)]/20 bg-[var(--loss)]/5 px-4 py-2">
          <p className="text-xs font-mono text-[var(--loss)]">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
        {loading && !portfolioData ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] animate-pulse" />
              <span className="text-xs font-mono text-[var(--muted-foreground)]">
                Loading portfolio...
              </span>
            </div>
          </div>
        ) : portfolioData ? (
          <div className="max-w-5xl">
            <div className="pt-4 pb-8">
              <EquityHero overview={portfolioData.overview} />
            </div>
            <HoldingsTable holdings={portfolioData.holdings} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-[var(--muted-foreground)]">
              No portfolio data available.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .portfolio-hero {
          animation: heroFadeIn 0.5s ease-out both;
        }
        .holdings-section {
          animation: holdingsFadeIn 0.5s ease-out 0.15s both;
        }
        .portfolio-card-enter {
          animation: cardSlideUp 0.4s ease-out both;
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes holdingsFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
