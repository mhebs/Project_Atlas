export type WorkspaceDocName = "STRATEGY.md" | "PORTFOLIO.md" | "USER.md"

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
  toolCalls: TranscriptToolCall[]
  toolCallId: string | null
  name: string | null
}

export interface SessionTranscript {
  sessionId: string
  status: "running" | "completed" | "error"
  startedAt: string
  endedAt: string | null
  error: string | null
  mtimeMs: number
  messageCount: number
  messages: TranscriptMessage[]
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
}

export type LatestSessionResponse = SessionTranscript | EmptySessionTranscript
