import type { ActivityItem, DialogueMessage, AgentStatus } from "./types";

export const sampleActivity: ActivityItem[] = [
  {
    id: "act-1",
    timestamp: "2026-02-20T09:15:00Z",
    title: "Rebalanced Core Holdings",
    summary:
      "Shifted 3% from large-cap tech into defensive healthcare to reduce sector concentration.",
    status: "Executed",
    tags: ["Rebalance", "Sector Rotation"],
    reasoning:
      "Tech allocation exceeded the 25% soft ceiling. Healthcare currently trades at a historical P/E discount with strong earnings visibility. This rotation maintains growth exposure while improving downside resilience within your mandate.",
  },
  {
    id: "act-2",
    timestamp: "2026-02-19T14:30:00Z",
    title: "Monitoring: Emerging Market Volatility",
    summary:
      "Tracking elevated VIX in EM equities. No action taken yet; within guardrails.",
    status: "Monitoring",
    tags: ["Macro", "Risk Watch"],
    reasoning:
      "EM volatility has risen 18% week-over-week but your portfolio exposure is only 4.2%, well within the position sizing limit. Continuing to monitor for a sustained move above the 90-day average before recommending any adjustment.",
  },
  {
    id: "act-3",
    timestamp: "2026-02-18T11:00:00Z",
    title: "Cash Buffer Replenished",
    summary:
      "Harvested gains from tactical bond position to bring cash buffer back to 20%.",
    status: "Executed",
    tags: ["Cash Management", "Tactical"],
    reasoning:
      "The short-duration bond position reached its target yield. Liquidating and returning proceeds to cash maintains your specified 20% buffer and ensures dry powder for opportunistic entries.",
  },
  {
    id: "act-4",
    timestamp: "2026-02-17T16:45:00Z",
    title: "Paused: Commodity Trend Signal",
    summary:
      "A trend-following signal appeared in energy commodities. Awaiting confirmation before entry.",
    status: "Paused",
    tags: ["Trend Following", "Commodities"],
    reasoning:
      "The 50-day moving average crossover triggered for crude oil futures, but volume confirmation is below threshold. Historical backtest shows 34% higher win rate when volume confirms within 48 hours. Holding for now.",
  },
];

export const seededDialogue: DialogueMessage[] = [
  {
    id: "msg-1",
    role: "agent",
    content:
      "Good morning. I've completed the overnight scan across 247 assets in your universe. All positions are within mandate parameters. One item worth noting: the defensive healthcare allocation from yesterday is already showing relative strength.",
    timestamp: "2026-02-20T08:00:00Z",
    constraints: ["Drawdown OK", "Cash buffer OK", "Position sizing OK"],
  },
  {
    id: "msg-2",
    role: "user",
    content: "How's the overall portfolio looking this week?",
    timestamp: "2026-02-20T08:05:00Z",
  },
  {
    id: "msg-3",
    role: "agent",
    content:
      "The portfolio is up 0.7% week-to-date, outperforming the benchmark by 22 basis points. Core holdings are stable. The tactical sleeve is flat as I'm being patient with entry timing on the commodity signal. Your cash buffer sits at exactly 20%, ready for deployment when the right setup appears.",
    timestamp: "2026-02-20T08:06:00Z",
    constraints: ["Drawdown OK", "Cash buffer OK", "Position sizing OK"],
  },
  {
    id: "msg-4",
    role: "user",
    content: "What's your biggest concern right now?",
    timestamp: "2026-02-20T08:10:00Z",
  },
  {
    id: "msg-5",
    role: "agent",
    content:
      "Emerging market volatility is the one area I'm watching closely. It hasn't breached any guardrails yet, but the trend is accelerating. If EM VIX moves above its 90-day average, I'll recommend trimming the 4.2% exposure there. Nothing urgent, but I want to stay ahead of it rather than react.",
    timestamp: "2026-02-20T08:11:00Z",
    constraints: ["Drawdown OK", "Cash buffer OK", "Position sizing OK"],
  },
];

export const agentStatus: AgentStatus = {
  monitoringCount: 247,
  lastAction: "Rebalanced Core Holdings",
};
