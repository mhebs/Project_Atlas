export type Personality = "Preserve & Compound" | "Systematic Growth" | "Tactical & Opportunistic" | "Experimental";

export type RiskResponse = "Add more capital" | "Hold steady" | "Reduce exposure" | "Exit fully";

export type RiskFollowUp = "Immediately" | "Over weeks" | "Hard stop" | "Ask me";

export type Engagement = "Just execute my strategy" | "Notify me before major reallocations" | "Ask me before every trade";

export type StrategyBias = "Buy strong companies and hold" | "Trade structured setups" | "Follow macro trends" | "Blend strategies intelligently";

export type CoreStrategy = "Trend Following" | "Quality Hold" | "Macro Tilt" | "Blended";

export type RebalanceCadence = "Weekly" | "Monthly" | "Quarterly";

export interface Allocation {
  label: "Core" | "Tactical" | "Cash";
  pct: number;
}

export interface Guardrails {
  maxDrawdownPct: number;
  cashBufferPct: number;
  maxPositionPct: number;
  rebalanceCadence: RebalanceCadence;
}

export interface Mandate {
  coreStrategy: CoreStrategy;
  allocations: Allocation[];
  guardrails: Guardrails;
}

export type ActivityStatus = "Executed" | "Monitoring" | "Paused";

export interface ActivityItem {
  id: string;
  timestamp: string;
  title: string;
  summary: string;
  status: ActivityStatus;
  tags: string[];
  reasoning: string;
}

export interface DialogueMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  constraints?: string[];
}

export interface AgentStatus {
  monitoringCount: number;
  lastAction: string;
}

export interface AppState {
  agentName: string;
  personality: Personality | null;
  riskResponse: RiskResponse | null;
  riskFollowUp: RiskFollowUp | null;
  engagement: Engagement | null;
  strategyBias: StrategyBias | null;
  isActivated: boolean;
  mandate: Mandate;
}
