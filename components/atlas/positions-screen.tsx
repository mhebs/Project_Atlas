"use client"

const positions = [
  {
    ticker: "AAPL",
    side: "Long",
    quantity: 25,
    entry: 182.14,
    current: 187.22,
    pnl: 127.0,
  },
  {
    ticker: "MSFT",
    side: "Long",
    quantity: 10,
    entry: 412.55,
    current: 405.32,
    pnl: -72.3,
  },
  {
    ticker: "SPY",
    side: "Long",
    quantity: 15,
    entry: 498.22,
    current: 503.8,
    pnl: 83.7,
  },
]

function formatCurrency(value: number, showSign = false) {
  const formatted = Math.abs(value).toFixed(2)
  const sign = value >= 0 ? "+" : "-"
  return showSign ? `${sign}$${formatted}` : `$${formatted}`
}

// Desktop table
function PositionsTable() {
  return (
    <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-mono font-medium text-muted-foreground px-5 py-3 uppercase tracking-wider">
              Ticker
            </th>
            <th className="text-left text-xs font-mono font-medium text-muted-foreground px-5 py-3 uppercase tracking-wider">
              Side
            </th>
            <th className="text-right text-xs font-mono font-medium text-muted-foreground px-5 py-3 uppercase tracking-wider">
              Qty
            </th>
            <th className="text-right text-xs font-mono font-medium text-muted-foreground px-5 py-3 uppercase tracking-wider">
              Entry
            </th>
            <th className="text-right text-xs font-mono font-medium text-muted-foreground px-5 py-3 uppercase tracking-wider">
              Current
            </th>
            <th className="text-right text-xs font-mono font-medium text-muted-foreground px-5 py-3 uppercase tracking-wider">
              {"Unrealized P&L"}
            </th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => (
            <tr
              key={pos.ticker}
              className="border-b border-border last:border-b-0 h-12"
            >
              <td className="px-5 py-3 font-mono text-sm font-medium text-foreground">
                {pos.ticker}
              </td>
              <td className="px-5 py-3 text-sm text-muted-foreground">
                {pos.side}
              </td>
              <td className="px-5 py-3 text-right font-mono text-sm text-foreground">
                {pos.quantity}
              </td>
              <td className="px-5 py-3 text-right font-mono text-sm text-foreground">
                {pos.entry.toFixed(2)}
              </td>
              <td className="px-5 py-3 text-right font-mono text-sm text-foreground">
                {pos.current.toFixed(2)}
              </td>
              <td
                className={`px-5 py-3 text-right font-mono text-sm font-medium ${
                  pos.pnl >= 0 ? "text-gain" : "text-loss"
                }`}
              >
                {formatCurrency(pos.pnl, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Mobile stacked cards
function PositionCards() {
  return (
    <div className="md:hidden flex flex-col gap-3">
      {positions.map((pos) => (
        <div
          key={pos.ticker}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-foreground">
                {pos.ticker}
              </span>
              <span className="text-xs text-muted-foreground">{pos.side}</span>
            </div>
            <span
              className={`font-mono text-sm font-medium ${
                pos.pnl >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {formatCurrency(pos.pnl, true)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Qty</p>
              <p className="text-sm font-mono text-foreground">{pos.quantity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entry</p>
              <p className="text-sm font-mono text-foreground">{pos.entry.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-sm font-mono text-foreground">{pos.current.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PositionsScreen() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4">
        <h2 className="font-serif text-2xl text-foreground">Positions</h2>
        <p className="text-xs font-mono text-muted-foreground mt-1">
          Last sync 14:32:07
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <PositionsTable />
        <PositionCards />
      </div>
    </div>
  )
}
