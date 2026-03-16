export type WorkspaceDocName = "STRATEGY.md" | "PORTFOLIO.md" | "ACCOUNTS.md" | "USER.md"

export interface WorkspaceDoc {
  name: WorkspaceDocName
  exists: boolean
  content: string
  mtimeMs: number | null
}

export type StrategySummaryCardKind = "table" | "list" | "text" | "mixed"

export interface StrategySummaryCard {
  id: string
  title: string
  kind: StrategySummaryCardKind
  summary: string
  excerpt: string
}

export type StrategyPresentationMode = "llm" | "heuristic"

export interface StrategyPresentationTile {
  id: string
  label: string
  value: string
  detail: string
}

export interface StrategyPresentation {
  mode: StrategyPresentationMode
  headline: string
  subheadline: string
  panelTitle: string
  panelSubtitle: string
  footnote: string
  tiles: StrategyPresentationTile[]
}

export interface StrategySummaryResponse {
  file: "STRATEGY.md"
  mtimeMs: number | null
  cards: StrategySummaryCard[]
  presentation: StrategyPresentation
  rawContent: string
  exists: boolean
}

export type TranscriptRole = "system" | "user" | "assistant" | "tool"

export interface TranscriptToolCall {
  id: string
  name: string
  arguments: string
}

export interface TranscriptMessage {
  index: number
  timestamp: string
  role: TranscriptRole
  content: string
  reasoning: string | null
  toolCalls: TranscriptToolCall[]
  toolCallId: string | null
  name: string | null
}

export interface PendingQuestionOption {
  label: string
  description: string
}

export interface PendingQuestionItem {
  question: string
  header?: string
  options: PendingQuestionOption[]
  multiSelect: boolean
}

export interface PendingQuestion {
  id: string
  questions: PendingQuestionItem[]
  askedAt: string
}

export interface SessionTranscript {
  sessionId: string
  status: "running" | "completed" | "error" | "awaiting_input"
  startedAt: string
  endedAt: string | null
  error: string | null
  mtimeMs: number
  messageCount: number
  messages: TranscriptMessage[]
  pendingQuestion?: PendingQuestion | null
}

export interface EmptySessionTranscript {
  sessionId: null
  status: null
  startedAt: null
  endedAt: null
  error: null
  mtimeMs: null
  messageCount: 0
  messages: TranscriptMessage[]
  pendingQuestion: null
}

export type LatestSessionResponse = SessionTranscript | EmptySessionTranscript

export interface ChatStreamToolCall {
  id: string
  name: string
  arguments: string
}

export interface ChatStreamItem {
  index: number
  timestamp: string
  role: TranscriptRole
  content: string
  reasoning: string | null
  toolCalls: ChatStreamToolCall[]
  toolCallId: string | null
  name: string | null
}

export type ChatStreamEvent =
  | {
      type: "turn/started"
      threadId: string
      status: SessionTranscript["status"]
      startedAt: string
      pendingQuestion: PendingQuestion | null
    }
  | {
      type: "turn/updated" | "turn/completed"
      threadId: string
      status: SessionTranscript["status"]
      endedAt: string | null
      error: string | null
      pendingQuestion: PendingQuestion | null
    }
  | {
      type: "item/started" | "item/updated" | "item/completed"
      threadId: string
      itemId: string
      item: ChatStreamItem
    }
  | {
      type: "item/agentMessage/delta"
      threadId: string
      itemId: string
      index: number
      delta: string
    }
  | {
      type: "item/reasoning/delta"
      threadId: string
      itemId: string
      index: number
      delta: string
    }
  | {
      type: "error"
      message: string
    }
  | {
      type: "end"
    }

export type DebugResetMode = "full" | "partial_market_closed"

export interface DebugResetPosition {
  symbol: string
  qty: number
  avgEntryPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPl: number
}

export interface DebugResetBrokerSnapshot {
  marketOpen: boolean
  timestamp: string
  equity: number
  cash: number
  buyingPower: number
  dayPnl: number | null
  positions: DebugResetPosition[]
}

export interface DebugResetResponse {
  ok: boolean
  mode: DebugResetMode | null
  broker: DebugResetBrokerSnapshot | null
  filesReset: string[]
  sessionsDeleted: number
  tradesLogCleared: boolean
  wakeSchedulesCleared: boolean
  warnings: string[]
  error: string | null
}

/* ------------------------------------------------------------------ */
/*  Activity feed types                                                */
/* ------------------------------------------------------------------ */

export type ActivityEventKind = "session" | "trade" | "wake_audit"

export interface SessionActivityEvent {
  kind: "session"
  id: string
  timestamp: string
  sessionId: string
  trigger: string
  startedAt: string
  endedAt: string | null
  status: "running" | "completed" | "error"
  messageCount: number
  durationMs: number | null
}

export interface TradeActivityEvent {
  kind: "trade"
  id: string
  timestamp: string
  symbol: string
  side: string
  qty: number
  orderType: string
  estimatedPrice: number
  estimatedValue: number
  result: string
  reason: string | null
  orderId: string | null
}

export interface WakeAuditActivityEvent {
  kind: "wake_audit"
  id: string
  timestamp: string
  auditType: string
  actor: string
  summary: string
  metadata: Record<string, unknown>
}

export type ActivityEvent =
  | SessionActivityEvent
  | TradeActivityEvent
  | WakeAuditActivityEvent

export interface ActivityDay {
  date: string
  label: string
  events: ActivityEvent[]
}

export interface ActivityResponse {
  days: ActivityDay[]
  totalEvents: number
  filters: { kind: string }
}
