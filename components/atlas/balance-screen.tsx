"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts"

const equityData = [
  { date: "Jan", value: 23000 },
  { date: "Feb", value: 23250 },
  { date: "Mar", value: 22800 },
  { date: "Apr", value: 23500 },
  { date: "May", value: 23900 },
  { date: "Jun", value: 24100 },
  { date: "Jul", value: 23700 },
  { date: "Aug", value: 24300 },
  { date: "Sep", value: 24800 },
  { date: "Oct", value: 25104 },
  { date: "Nov", value: 24500 },
  { date: "Dec", value: 24831 },
]

const stats = [
  { label: "Starting Balance", value: "$23,000", mono: true },
  { label: "All-Time High", value: "$25,104", mono: true },
  { label: "Max Drawdown", value: "-6.2%", mono: true },
  { label: "Total Trades", value: "18", mono: true },
  { label: "Active Since", value: "Jan 2026", mono: false },
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-sm">
        <p className="text-xs font-mono text-foreground">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

export function BalanceScreen() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4">
        <h2 className="font-serif text-2xl text-foreground">
          Portfolio Overview
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Main Value */}
        <div className="bg-card border border-border rounded-lg p-6 mb-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
            Portfolio Value
          </p>
          <p className="text-4xl font-mono font-medium text-foreground tracking-tight">
            $24,831.44
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div>
              <span className="text-xs text-muted-foreground">Daily </span>
              <span className="text-sm font-mono text-gain font-medium">
                +$312.18 (1.27%)
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">All-Time </span>
              <span className="text-sm font-mono text-gain font-medium">
                +$1,842.11 (8.01%)
              </span>
            </div>
          </div>
        </div>

        {/* Equity Curve */}
        <div className="bg-card border border-border rounded-lg p-6 mb-4">
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider font-mono">
            Equity Curve
          </p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#8c857b", fontFamily: "var(--font-jetbrains-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[22000, 26000]}
                  tick={{ fontSize: 11, fill: "#8c857b", fontFamily: "var(--font-jetbrains-mono)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={23000}
                  stroke="#e8e3dc"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1f2a44"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#1f2a44", stroke: "#f6f3ee", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-4"
            >
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p
                className={`text-sm font-medium text-foreground ${
                  stat.mono ? "font-mono" : ""
                }`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
