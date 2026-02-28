import type { DebugResetBrokerSnapshot, DebugResetMode } from "@/lib/atlas-types"

export const RESETTABLE_WORKSPACE_FILES = [
  "USER.md",
  "STRATEGY.md",
  "PORTFOLIO.md",
  "ACCOUNTS.md",
  "MEMORY.md",
  "THESES.md",
  "WATCHLIST.md",
] as const

export type ResettableWorkspaceFile = (typeof RESETTABLE_WORKSPACE_FILES)[number]

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatUsd(value: number) {
  return USD_FORMATTER.format(value)
}

function formatSignedUsd(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${formatUsd(value)}`
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatQuantity(value: number) {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
}

function buildPortfolioMarkdown(
  snapshot: DebugResetBrokerSnapshot,
  mode: DebugResetMode,
  warnings: string[],
) {
  const updatedDate = new Date(snapshot.timestamp).toISOString().slice(0, 10)
  const dayPnl = snapshot.dayPnl === null ? "N/A" : formatSignedUsd(snapshot.dayPnl)

  const holdingsRows = snapshot.positions
    .map((position) => {
      const weight = snapshot.equity > 0 ? (position.marketValue / snapshot.equity) * 100 : 0
      return [
        `| ${position.symbol} | ${formatQuantity(position.qty)} | ${formatUsd(position.avgEntryPrice)} | ~${formatUsd(position.currentPrice)} | ${formatUsd(position.marketValue)} | ${formatSignedUsd(position.unrealizedPl)} | ${formatPercent(weight)} |`,
      ].join("\n")
    })
    .join("\n")

  const warningSection =
    mode === "partial_market_closed" && warnings.length > 0
      ? `\n## Reset Warning\n\n${warnings.map((warning) => `- ${warning}`).join("\n")}\n`
      : ""

  return [
    "# Portfolio",
    "",
    "> Auto-updated by the agent each cycle. Do not edit manually.",
    "",
    `**Updated**: ${updatedDate}`,
    "",
    "## Overview",
    "",
    `- **Equity**: ${formatUsd(snapshot.equity)}`,
    `- **Cash**: ${formatUsd(snapshot.cash)}`,
    `- **Buying Power**: ${formatUsd(snapshot.buyingPower)}`,
    `- **Day P&L**: ${dayPnl}`,
    "",
    "## Holdings",
    "",
    "| Symbol | Qty | Avg Cost | Price | Value | P&L | Weight |",
    "|--------|-----|----------|-------|-------|-----|--------|",
    holdingsRows,
    "",
    "## Today's Activity",
    "",
    "Reset via debug mode.",
    warningSection,
  ]
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n")
    .trimEnd() + "\n"
}

function buildAccountsMarkdown(
  snapshot: DebugResetBrokerSnapshot,
  mode: DebugResetMode,
  warnings: string[],
) {
  const updatedAt = new Date(snapshot.timestamp).toISOString().replace("T", " ").replace(".000Z", " UTC")
  const warningSection =
    mode === "partial_market_closed" && warnings.length > 0
      ? `\n## Reset Warning\n\n${warnings.map((warning) => `- ${warning}`).join("\n")}\n`
      : ""

  return [
    "# Connected Accounts",
    "",
    "## Alpaca (Paper Trading)",
    "",
    "| Field | Value |",
    "|-------|-------|",
    "| **Status** | Connected |",
    "| **Mode** | Paper Trading |",
    `| **Equity** | ${formatUsd(snapshot.equity)} |`,
    `| **Buying Power** | ${formatUsd(snapshot.buyingPower)} |`,
    `| **Cash** | ${formatUsd(snapshot.cash)} |`,
    `| **Open Positions** | ${snapshot.positions.length} |`,
    `| **Last Synced** | ${updatedAt} |`,
    warningSection,
    "---",
    "",
    "*Last updated by Meridian debug reset.*",
  ]
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n")
    .trimEnd() + "\n"
}

const USER_PLACEHOLDER = "# User Profile\n\n(Not yet configured. Awaiting user input.)\n"
const STRATEGY_PLACEHOLDER = "# Active Strategy\n\n(Not yet configured. Awaiting user input.)\n"

const MEMORY_BASELINE = `# Agent Memory

Persistent observations and learnings across sessions. The agent writes here to remember context that should survive restarts.

Entries should be factual - things that happened, patterns observed, lessons learned. Each entry includes a date.

## Entries

<!-- No entries yet. -->
`

const THESES_BASELINE = `# Investment Theses

## Active Theses

<!-- For each stock under consideration, create a section using this template:

### SYMBOL - Company Name

- **Date opened:** YYYY-MM-DD
- **Source:** Where the idea came from
- **Thesis:** 2-3 sentence summary of why this stock is worth owning
- **Key metrics:**
  - P/E:
  - Forward P/E:
  - Revenue growth:
  - Profit margin:
  - Debt/Equity:
- **Catalysts:** What could drive the stock higher
- **Risks:** What could go wrong
- **Exit criteria:** When to sell
- **Status:** Researching | Ready to buy | Holding | Exiting
- **Conviction:** Low | Medium | High

-->

## Closed Theses

<!-- Move theses here when a position is fully exited or the thesis is abandoned.
     Add: Date closed, Outcome (profit/loss %), Lessons learned.
-->
`

const WATCHLIST_BASELINE = `# Watchlist

## Active Research

<!-- Add stocks here as they come up in research. Format:
| Symbol | Source | Date Added | Notes |
|--------|--------|------------|-------|
-->

| Symbol | Source | Date Added | Notes |
|--------|--------|------------|-------|

## Recently Removed

<!-- Move stocks here when dropping from active research. Include reason. -->

| Symbol | Date Removed | Reason |
|--------|--------------|--------|
`

export function buildResetMarkdownFiles(
  snapshot: DebugResetBrokerSnapshot,
  mode: DebugResetMode,
  warnings: string[],
): Record<ResettableWorkspaceFile, string> {
  return {
    "USER.md": USER_PLACEHOLDER,
    "STRATEGY.md": STRATEGY_PLACEHOLDER,
    "PORTFOLIO.md": buildPortfolioMarkdown(snapshot, mode, warnings),
    "ACCOUNTS.md": buildAccountsMarkdown(snapshot, mode, warnings),
    "MEMORY.md": MEMORY_BASELINE,
    "THESES.md": THESES_BASELINE,
    "WATCHLIST.md": WATCHLIST_BASELINE,
  }
}
