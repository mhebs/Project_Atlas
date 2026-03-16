"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import type {
  ChatStreamEvent,
  ChatStreamItem,
  LatestSessionResponse,
  PendingQuestion,
  SessionTranscript,
  TranscriptMessage,
} from "@/lib/atlas-types"
import { ActiveItemStreamController, STREAM_TICK_MS } from "@/lib/stream-controller"
import { Message } from "@/components/ui/message"
import { StreamingMarkdown } from "@/components/ui/streaming-markdown"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input"
import { Loader } from "@/components/ui/loader"
import { PromptSuggestion } from "@/components/ui/prompt-suggestion"
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought"

function upsertMessages(
  existing: TranscriptMessage[],
  updates: TranscriptMessage[],
): TranscriptMessage[] {
  const nextByIndex = new Map<number, TranscriptMessage>()

  for (const message of existing) {
    nextByIndex.set(message.index, message)
  }
  for (const message of updates) {
    nextByIndex.set(message.index, message)
  }

  return Array.from(nextByIndex.values()).sort((a, b) => a.index - b.index)
}

function findMessageByIndex(
  messages: TranscriptMessage[],
  index: number,
): TranscriptMessage | undefined {
  return messages.find((message) => message.index === index)
}

type StreamingDraft = {
  content: string
  reasoning: string
}

function draftsEqual(
  a: Record<number, StreamingDraft>,
  b: Record<number, StreamingDraft>,
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    const aDraft = a[Number(key)]
    const bDraft = b[Number(key)]
    if (!bDraft) return false
    if (aDraft.content !== bDraft.content || aDraft.reasoning !== bDraft.reasoning) {
      return false
    }
  }

  return true
}

/* Compass avatar for assistant messages */
function CompassAvatar() {
  return (
    <div className="relative h-8 w-8 shrink-0">
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="#d4af37" strokeWidth="0.8" opacity="0.5" />
        <circle cx="20" cy="20" r="13" stroke="#d4af37" strokeWidth="1" opacity="0.7" />
        <circle cx="20" cy="20" r="7" stroke="#d4af37" strokeWidth="0.8" fill="rgba(212,175,55,0.06)" opacity="0.8" />
        <line x1="16" y1="24" x2="24" y2="16" stroke="#d4af37" strokeWidth="1" opacity="0.65" />
        <circle cx="20" cy="20" r="1" fill="#d4af37" opacity="0.5" />
      </svg>
    </div>
  )
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function normalizeEscapedNewlines(text: string): string {
  return text.replace(/\\n/g, "\n")
}

function splitThinkBlocks(content: string): { reasoning: string | null; visibleContent: string } {
  const normalized = normalizeEscapedNewlines(content)
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi
  const reasoningParts: string[] = []
  let match: RegExpExecArray | null = null

  while ((match = thinkRegex.exec(normalized)) !== null) {
    const part = (match[1] || "").trim()
    if (part) reasoningParts.push(part)
  }

  const visibleContent = normalized.replace(thinkRegex, "").trim()
  return {
    reasoning: reasoningParts.length > 0 ? reasoningParts.join("\n\n") : null,
    visibleContent,
  }
}

function isToolProgressStatusText(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  if (!normalized || normalized.length > 160) return false

  if (!normalized.includes("strategy.md")) return false

  return (
    normalized.startsWith("verifying") ||
    normalized.startsWith("checking") ||
    normalized.startsWith("writing") ||
    normalized.startsWith("reading") ||
    normalized.startsWith("strategy.md written") ||
    normalized.includes("verifying strategy.md") ||
    normalized.includes("written correctly") ||
    normalized.includes("saved correctly")
  )
}

/* Atlas gold theme overrides for the Markdown component */
const atlasMarkdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-serif text-[#1A1507]">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-serif text-[#1A1507]">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-[#1A1507]">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm leading-relaxed text-[#2C2617]">{children}</p>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm leading-relaxed text-[#2C2617]">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-[#d4af37]/40 pl-4 text-sm leading-relaxed text-[#6B6259] italic">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto rounded-xl border border-[#c8a43a]/20 bg-[#F5F0E8]/50">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-[#9A7B2A]">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-t border-[#c8a43a]/15 px-3 py-2 text-[#2C2617]">{children}</td>
  ),
  hr: () => <hr className="border-t border-[#c8a43a]/20" />,
}

function toolCallLabel(name: string): string {
  const labels: Record<string, string> = {
    edit_file: "Editing file",
    search_files: "Searching files",
    list_files: "Listing files",
    run_terminal_command: "Running command",
    ask_followup_question: "Preparing question",
    attempt_completion: "Finalizing",
  }
  return labels[name] || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function toolCallIcon(name: string) {
  // SVG icons themed to Atlas gold
  const iconClass = "h-4 w-4 text-[#9A7B2A]"
  if (name.includes("read") || name.includes("list")) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h12M2 8h12M2 12h8" />
      </svg>
    )
  }
  if (name.includes("write") || name.includes("edit")) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 2l3 3-8 8H3v-3l8-8z" />
      </svg>
    )
  }
  if (name.includes("search")) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="4" />
        <path d="M10 10l3.5 3.5" />
      </svg>
    )
  }
  if (name.includes("terminal") || name.includes("command")) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5l3 3-3 3M9 11h4" />
      </svg>
    )
  }
  if (name.includes("question") || name.includes("ask")) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" />
        <path d="M6 6.5a2 2 0 0 1 3.5 1.5c0 1-1.5 1.5-1.5 1.5M8 12h.01" />
      </svg>
    )
  }
  // Default: compass-like dot
  return (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
    </svg>
  )
}

function parseToolArgs(argsJson: string): string | null {
  try {
    const parsed = JSON.parse(argsJson)
    // Show the most relevant field
    if (parsed.path) return parsed.path
    if (parsed.file_path) return parsed.file_path
    if (parsed.query) return parsed.query
    if (parsed.command) return parsed.command
    if (parsed.question) return parsed.question
    if (parsed.result) return typeof parsed.result === "string" ? parsed.result.slice(0, 120) : null
    return null
  } catch {
    return null
  }
}

type ReasoningStep = {
  title: string
  items: string[]
}

function parseReasoningSteps(reasoning: string): ReasoningStep[] {
  const sections = normalizeEscapedNewlines(reasoning)
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)
    .slice(0, 6)

  return sections.map((section, index) => {
    const lines = section
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    const firstLine = lines[0] ?? ""
    const headingMatch = firstLine.match(/^([A-Za-z][^:]{1,80}):\s*(.*)$/)
    const bulletItems = lines
      .map((line) => line.replace(/^(?:[-*•]|\d+[.)])\s+/, "").trim())
      .filter(Boolean)

    if (headingMatch) {
      const title = headingMatch[1].trim()
      const firstDetail = headingMatch[2].trim()
      const tail = lines.slice(1).map((line) => line.replace(/^(?:[-*•]|\d+[.)])\s+/, "").trim())
      const items = [firstDetail, ...tail].filter(Boolean)
      return { title, items: items.length > 0 ? items : [section] }
    }

    if (bulletItems.length > 1) {
      return {
        title: `Thinking step ${index + 1}`,
        items: bulletItems,
      }
    }

    return {
      title: `Thinking step ${index + 1}`,
      items: [section],
    }
  })
}

function reasoningStepIcon(stepIndex: number) {
  const iconClass = "h-4 w-4 text-[#9A7B2A]"
  if (stepIndex === 0) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="4" />
        <path d="M10 10l3.5 3.5" />
      </svg>
    )
  }
  if (stepIndex === 1) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5v1.5M3.8 3.8l1 1M12.2 3.8l-1 1M2.5 8H4M12 8h1.5" />
        <path d="M6.2 6.5a1.8 1.8 0 0 1 3.6 0c0 .8-.4 1.3-.9 1.8-.5.4-.7.8-.7 1.2h-1.2c0-.6.3-1.2.9-1.7.4-.4.7-.7.7-1.3a.6.6 0 0 0-1.2 0" />
        <path d="M6.5 12h3" />
      </svg>
    )
  }
  if (stepIndex === 2) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="5.5" />
        <circle cx="8" cy="8" r="2.5" />
        <circle cx="8" cy="8" r="0.7" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
    </svg>
  )
}

function AssistantChainOfThought({
  reasoning,
  toolCalls,
  toolResults,
  isStreaming,
}: {
  reasoning: string | null
  toolCalls: TranscriptMessage["toolCalls"]
  toolResults: Map<string, TranscriptMessage>
  isStreaming: boolean
}) {
  const hasReasoning = Boolean(reasoning && reasoning.length > 0)
  const hasToolCalls = toolCalls.length > 0
  const isThinking = isStreaming && hasReasoning && !hasToolCalls
  const reasoningSteps = hasReasoning && reasoning ? parseReasoningSteps(reasoning) : []
  if (!hasReasoning && !hasToolCalls) return null

  return (
    <ChainOfThought className="mb-2">
      {reasoningSteps.map((step, index) => (
        <ChainOfThoughtStep key={`reasoning-${index}`} defaultOpen={index === 0}>
          <ChainOfThoughtTrigger
            leftIcon={reasoningStepIcon(index)}
            className="font-mono text-[12px] text-[#8C8375] hover:text-[#2C2617]"
          >
            {step.title}
            {isThinking && index === reasoningSteps.length - 1 && (
              <Loader variant="typing" size="sm" className="ml-2 text-[#d4af37]" />
            )}
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <div className="space-y-2">
              {step.items.map((item, itemIndex) => (
                <ChainOfThoughtItem
                  key={`reasoning-${index}-${itemIndex}`}
                  className="max-h-48 overflow-y-auto text-[13px] font-serif leading-relaxed text-[#6B6259]"
                >
                  <div className="whitespace-pre-wrap break-words">{item}</div>
                </ChainOfThoughtItem>
              ))}
            </div>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
      ))}

      {toolCalls.map((tc) => {
        const result = toolResults.get(tc.id)
        const argDetail = parseToolArgs(tc.arguments)
        const isRunning = !result && isStreaming

        return (
          <ChainOfThoughtStep key={tc.id}>
            <ChainOfThoughtTrigger
              leftIcon={toolCallIcon(tc.name)}
              className="font-mono text-[12px] text-[#8C8375] hover:text-[#2C2617]"
            >
              {toolCallLabel(tc.name)}
              {argDetail && (
                <span className="ml-1.5 max-w-[240px] truncate text-[11px] text-[#8C8375]/70">
                  {argDetail}
                </span>
              )}
              {isRunning && (
                <Loader variant="typing" size="sm" className="ml-2 text-[#d4af37]" />
              )}
            </ChainOfThoughtTrigger>
            <ChainOfThoughtContent>
              {result ? (
                <ChainOfThoughtItem className="max-h-40 overflow-y-auto rounded-lg bg-[#F5F0E8] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#6B6259]">
                  <pre className="whitespace-pre-wrap break-words">{result.content.slice(0, 800)}{result.content.length > 800 ? "..." : ""}</pre>
                </ChainOfThoughtItem>
              ) : (
                <ChainOfThoughtItem className="text-[11px] text-[#8C8375]/60 italic">
                  {isStreaming ? "Running..." : "No output"}
                </ChainOfThoughtItem>
              )}
            </ChainOfThoughtContent>
          </ChainOfThoughtStep>
        )
      })}
    </ChainOfThought>
  )
}

function MessageBubble({
  message,
  isStreaming,
  toolResults,
  liveItem,
}: {
  message: TranscriptMessage
  isStreaming: boolean
  toolResults: Map<string, TranscriptMessage>
  liveItem?: StreamingDraft | null
}) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isTool = message.role === "tool"
  const isSystem = message.role === "system"

  if (isSystem || isTool) return null

  if (isUser) {
    return (
      <Message className="justify-end">
        <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%]">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
            You
          </p>
          <div className="rounded-2xl border border-[#c8a43a]/10 bg-[#1A1507] px-5 py-4">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#f3ead8]">
              {message.content}
            </p>
          </div>
          <span className="mt-2 font-mono text-[10px] text-[#8C8375]">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </Message>
    )
  }

  const parsed = splitThinkBlocks(message.content)
  const reasoningBase = message.reasoning ?? parsed.reasoning
  const reasoningText =
    (reasoningBase ?? "") || (liveItem?.reasoning ?? "")
      ? `${reasoningBase ?? ""}${liveItem?.reasoning ?? ""}`
      : null
  const visibleContent = parsed.visibleContent
  const liveContent = liveItem?.content ?? ""
  const hasReasoning = Boolean(reasoningText && reasoningText.length > 0)
  const hasToolCalls = message.toolCalls.length > 0
  const hasChain = hasReasoning || hasToolCalls
  const suppressToolProgressBubble =
    isAssistant &&
    hasToolCalls &&
    Boolean(visibleContent || liveContent) &&
    isToolProgressStatusText(`${visibleContent}${liveContent}`)

  // Nothing to show at all
  if (!hasChain && !visibleContent && !liveContent) return null

  return (
    <Message className="justify-start">
      <CompassAvatar />
      <div className="max-w-[85%] min-w-0 flex-1 sm:max-w-[75%]">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
          Meridian
        </p>
        <div className="space-y-2">
          {hasChain && (
            <AssistantChainOfThought
              reasoning={reasoningText}
              toolCalls={message.toolCalls}
              toolResults={toolResults}
              isStreaming={isStreaming}
            />
          )}

          {(visibleContent || liveContent) && !suppressToolProgressBubble && (
            <div className="rounded-2xl border-l-2 border-[#c8a43a]/40 bg-[#FFFFFF] px-5 py-4">
              <StreamingMarkdown
                id={`msg-${message.index}`}
                committed={visibleContent}
                liveTail={liveContent}
                className="space-y-4 break-words"
                components={atlasMarkdownComponents}
              />
            </div>
          )}

          {isStreaming && !visibleContent && !liveContent && !hasChain && (
            <Loader variant="typing" size="sm" className="text-[#d4af37]" />
          )}

          <span className="block font-mono text-[10px] text-[#8C8375]">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </Message>
  )
}

const MemoizedMessageBubble = memo(
  MessageBubble,
  (prev, next) =>
    prev.message === next.message &&
    prev.isStreaming === next.isStreaming &&
    prev.toolResults === next.toolResults &&
    prev.liveItem === next.liveItem,
)

/* Stepper-style question panel: each question is a tab, last tab is review/submit */
function QuestionPanel({
  pendingQuestion,
  sessionId,
  onSubmitted,
}: {
  pendingQuestion: PendingQuestion
  sessionId: string
  onSubmitted: (answers: Record<string, string>) => void
}) {
  const questions = pendingQuestion.questions
  const totalSteps = questions.length + 1 // questions + submit tab
  const [activeTab, setActiveTab] = useState(0)
  const [selections, setSelections] = useState<Record<number, Set<number>>>({})
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Track single-select clicks to auto-advance via useEffect
  const [pendingAdvance, setPendingAdvance] = useState<number | null>(null)

  const isSubmitTab = activeTab === questions.length

  const isQuestionAnswered = (qIndex: number) => {
    const selected = selections[qIndex]
    const other = (otherTexts[qIndex] ?? "").trim()
    return (selected && selected.size > 0) || other.length > 0
  }

  const getAnswerSummary = (qIndex: number) => {
    const q = questions[qIndex]
    const selected = selections[qIndex] ?? new Set<number>()
    const labels = Array.from(selected).map((idx) => q.options[idx]?.label).filter(Boolean)
    const other = (otherTexts[qIndex] ?? "").trim()
    if (other) labels.push(other)
    return labels.join(", ") || "(no selection)"
  }

  const selectOption = (qIndex: number, optIndex: number, multiSelect: boolean) => {
    setSelections((prev) => {
      const current = prev[qIndex] ?? new Set<number>()
      const next = new Set(current)
      if (multiSelect) {
        if (next.has(optIndex)) next.delete(optIndex)
        else next.add(optIndex)
      } else {
        next.clear()
        next.add(optIndex)
      }
      return { ...prev, [qIndex]: next }
    })

    // For single-select, schedule an auto-advance
    if (!multiSelect) {
      setPendingAdvance(qIndex)
    }
  }

  // Auto-advance after single-select: runs after selections state is committed
  useEffect(() => {
    if (pendingAdvance === null) return
    const timer = setTimeout(() => {
      setActiveTab((prev) => Math.min(prev + 1, totalSteps - 1))
      setPendingAdvance(null)
    }, 300)
    return () => clearTimeout(timer)
  }, [pendingAdvance, totalSteps])

  const goBack = () => setActiveTab((prev) => Math.max(prev - 1, 0))
  const goForward = () => setActiveTab((prev) => Math.min(prev + 1, totalSteps - 1))

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)

    const answers: Record<string, string> = {}
    for (let i = 0; i < questions.length; i++) {
      answers[questions[i].question] = getAnswerSummary(i)
    }

    try {
      const res = await fetch("/api/sessions/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: pendingQuestion.id,
          answers,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSubmitError(data.error || "Failed to submit")
      } else {
        setSubmitted(true)
        onSubmitted(answers)
      }
    } catch {
      setSubmitError("Failed to submit answer")
    } finally {
      setSubmitting(false)
    }
  }

  const tabLabel = (qIndex: number) => questions[qIndex].header || `Q${qIndex + 1}`

  return (
    <div className="mt-2 pb-4">
      <div className="rounded-2xl border border-[#c8a43a]/25 bg-[#FFFFFF] overflow-hidden">
        {/* Tab stepper bar */}
        <div className="flex items-center gap-1 border-b border-[#c8a43a]/15 px-3 py-2">
          <button
            type="button"
            onClick={goBack}
            disabled={activeTab === 0 || submitted}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9A7B2A] transition-colors hover:bg-[#F5F0E8] disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Previous"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {questions.map((_, qIndex) => {
              const answered = isQuestionAnswered(qIndex)
              const isCurrent = activeTab === qIndex && !submitted
              return (
                <button
                  key={qIndex}
                  type="button"
                  onClick={() => !submitted && setActiveTab(qIndex)}
                  disabled={submitted}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors ${
                    isCurrent
                      ? "bg-[#c8a43a]/15 text-[#2C2617] font-medium"
                      : "text-[#8C8375] hover:bg-[#F5F0E8] disabled:hover:bg-transparent"
                  }`}
                >
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${
                    answered
                      ? "border-[#9A7B2A] bg-[#9A7B2A] text-white"
                      : isCurrent
                        ? "border-[#c8a43a]/40"
                        : "border-[#c8a43a]/25"
                  }`}>
                    {answered && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {tabLabel(qIndex)}
                </button>
              )
            })}

            {/* Submit tab */}
            <button
              type="button"
              onClick={() => !submitted && setActiveTab(questions.length)}
              disabled={submitted}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors ${
                isSubmitTab || submitted
                  ? "bg-[#c8a43a]/15 text-[#2C2617] font-medium"
                  : "text-[#8C8375] hover:bg-[#F5F0E8]"
              }`}
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${
                submitted
                  ? "border-[#9A7B2A] bg-[#9A7B2A] text-white"
                  : isSubmitTab
                    ? "border-[#c8a43a]/40"
                    : "border-[#c8a43a]/25"
              }`}>
                {submitted && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              Submit
            </button>
          </div>

          <button
            type="button"
            onClick={goForward}
            disabled={activeTab === totalSteps - 1 || submitted}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9A7B2A] transition-colors hover:bg-[#F5F0E8] disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 3L9.5 7L5.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Tab body */}
        <div className="p-5">
          {submitted ? (
            /* Post-submit: locked review summary */
            <div>
              <p className="mb-4 text-[15px] font-medium text-[#2C2617]">
                Answers submitted
              </p>

              <div className="space-y-3">
                {questions.map((q, qIndex) => (
                  <div key={qIndex}>
                    <p className="text-[13px] text-[#8C8375]">{q.question}</p>
                    <p className="mt-0.5 text-[14px] font-medium text-[#9A7B2A]">
                      &rarr; {getAnswerSummary(qIndex)}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 font-mono text-[11px] text-[#8C8375]">
                Waiting for Meridian to continue...
              </p>
            </div>
          ) : !isSubmitTab ? (
            /* Question pane */
            (() => {
              const q = questions[activeTab]
              return (
                <div>
                  <p className="mb-4 text-[15px] font-medium leading-relaxed text-[#2C2617]">
                    {q.question}
                  </p>

                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = selections[activeTab]?.has(optIndex) ?? false
                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => selectOption(activeTab, optIndex, q.multiSelect)}
                          className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                            isSelected
                              ? "border-[#c8a43a]/40 bg-[#c8a43a]/10"
                              : "border-[#c8a43a]/15 bg-[#F5F0E8] hover:border-[#c8a43a]/25"
                          }`}
                        >
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                            q.multiSelect ? "rounded-sm" : "rounded-full"
                          } ${
                            isSelected
                              ? "border-[#d4af37] bg-[#d4af37]"
                              : "border-[#c8a43a]/30"
                          }`}>
                            {isSelected && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5L4 7L8 3" stroke="#1a1507" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <div>
                            <p className="text-[14px] font-medium text-[#2C2617]">{opt.label}</p>
                            <p className="mt-0.5 text-[13px] text-[#8C8375]">{opt.description}</p>
                          </div>
                        </button>
                      )
                    })}

                    {/* Other / free-text */}
                    <div className="flex items-center gap-3 rounded-xl border border-[#c8a43a]/15 bg-[#F5F0E8] px-4 py-3">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-[#c8a43a]/30" />
                      <input
                        type="text"
                        placeholder="Other..."
                        value={otherTexts[activeTab] ?? ""}
                        onChange={(e) => setOtherTexts((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                        className="w-full bg-transparent text-[14px] text-[#2C2617] placeholder:text-[#8C8375] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Multi-select: explicit next button */}
                  {q.multiSelect && (
                    <button
                      type="button"
                      onClick={goForward}
                      className="mt-4 rounded-lg bg-[#F5F0E8] px-4 py-2 font-mono text-[11px] text-[#9A7B2A] transition-colors hover:bg-[#EDE5D3]"
                    >
                      Next &rarr;
                    </button>
                  )}
                </div>
              )
            })()
          ) : (
            /* Submit / review pane */
            <div>
              <p className="mb-4 text-[15px] font-medium text-[#2C2617]">
                Review your answers
              </p>

              <div className="space-y-3">
                {questions.map((q, qIndex) => (
                  <div key={qIndex}>
                    <p className="text-[13px] text-[#8C8375]">{q.question}</p>
                    <p className="mt-0.5 text-[14px] font-medium text-[#9A7B2A]">
                      &rarr; {getAnswerSummary(qIndex)}
                    </p>
                  </div>
                ))}
              </div>

              {submitError && (
                <p className="mt-3 font-mono text-[11px] text-red-600">{submitError}</p>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className={`mt-5 rounded-xl px-6 py-2.5 font-mono text-[12px] uppercase tracking-wider transition-colors ${
                  submitting
                    ? "cursor-not-allowed bg-[#d4af37]/30 text-[#1a1507]/60"
                    : "cursor-pointer bg-[#d4af37]/80 text-[#1a1507] hover:bg-[#d4af37]"
                }`}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CompletedAnswerCard({ answers }: { answers: Record<string, string> }) {
  return (
    <div className="mb-6 pl-11">
      <div className="max-w-[85%] rounded-2xl border border-[#c8a43a]/15 bg-[#FFFFFF] px-5 py-4 lg:max-w-[70%]">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
          Your answers
        </p>
        <div className="space-y-2">
          {Object.entries(answers).map(([question, answer]) => (
            <div key={question}>
              <p className="text-[13px] text-[#8C8375]">{question}</p>
              <p className="mt-0.5 text-[14px] font-medium text-[#9A7B2A]">
                &rarr; {answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ChatScreenProps {
  isOnboarding?: boolean
}

function isNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 64
}

function toolResultsSignature(messages: TranscriptMessage[]): string {
  let signature = ""
  for (const message of messages) {
    if (message.role === "tool" && message.toolCallId) {
      signature += `${message.index}:${message.toolCallId}:${message.content.length}:${message.timestamp}|`
    }
  }
  return signature
}

function toTranscriptMessage(item: ChatStreamItem): TranscriptMessage {
  return {
    index: item.index,
    timestamp: item.timestamp,
    role: item.role,
    content: item.content,
    reasoning: item.reasoning,
    toolCalls: item.toolCalls,
    toolCallId: item.toolCallId,
    name: item.name,
  }
}

function createBaseMessage(
  index: number,
  role: TranscriptMessage["role"] = "assistant",
): TranscriptMessage {
  return {
    index,
    timestamp: new Date().toISOString(),
    role,
    content: "",
    reasoning: null,
    toolCalls: [],
    toolCallId: null,
    name: null,
  }
}

export function ChatScreen({ isOnboarding }: ChatScreenProps = {}) {
  const [snapshot, setSnapshot] = useState<LatestSessionResponse | null>(null)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<"live" | "closed">("closed")
  const [liveItems, setLiveItems] = useState<Record<number, StreamingDraft>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const scrollFrameRef = useRef<number | null>(null)
  const streamControllersRef = useRef<Record<number, ActiveItemStreamController>>({})
  const streamTickFrameRef = useRef<number | null>(null)
  const activeStreamAbortRef = useRef<AbortController | null>(null)
  const stableToolResultsRef = useRef<{
    signature: string
    map: Map<string, TranscriptMessage>
  }>({
    signature: "",
    map: new Map(),
  })

  const activeStreamingAssistantIndex = useMemo(() => {
    const liveAssistantIndexes = Object.keys(liveItems)
      .map((value) => Number(value))
      .filter((index) => findMessageByIndex(messages, index)?.role === "assistant")

    if (liveAssistantIndexes.length > 0) {
      return Math.max(...liveAssistantIndexes)
    }

    if (!sending || !snapshot || snapshot.status !== "running") return null
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") {
        return messages[i].index
      }
    }
    return null
  }, [liveItems, messages, sending, snapshot])

  const isAwaitingInput = snapshot?.status === "awaiting_input"

  // Persist answered questions at their chronological position in the message flow
  const [completedAnswers, setCompletedAnswers] = useState<
    Array<{ id: string; answers: Record<string, string>; position: number }>
  >([])

  const renderItems = useMemo(() => {
    type Item =
      | { type: "message"; message: TranscriptMessage; sortKey: number }
      | { type: "answer"; data: { id: string; answers: Record<string, string> }; sortKey: number }

    const items: Item[] = [
      ...messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message): Item => ({ type: "message", message, sortKey: message.index })),
      ...completedAnswers.map((a): Item => ({ type: "answer", data: a, sortKey: a.position - 0.5 })),
    ]

    items.sort((a, b) => a.sortKey - b.sortKey)
    return items
  }, [messages, completedAnswers])

  const nextToolResultsSignature = useMemo(() => toolResultsSignature(messages), [messages])
  if (stableToolResultsRef.current.signature !== nextToolResultsSignature) {
    const map = new Map<string, TranscriptMessage>()
    for (const m of messages) {
      if (m.role === "tool" && m.toolCallId) {
        map.set(m.toolCallId, m)
      }
    }
    stableToolResultsRef.current = {
      signature: nextToolResultsSignature,
      map,
    }
  }
  const toolResultsMap = stableToolResultsRef.current.map

  const streamRenderKey = useMemo(() => {
    let lastAssistant: TranscriptMessage | null = null
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") {
        lastAssistant = messages[i]
        break
      }
    }
    const lastAssistantDraft =
      lastAssistant && lastAssistant.index in liveItems
        ? liveItems[lastAssistant.index]
        : null
    return [
      messages.length,
      lastAssistant?.index ?? -1,
      lastAssistant?.content.length ?? 0,
      lastAssistant?.reasoning?.length ?? 0,
      lastAssistantDraft?.content.length ?? 0,
      lastAssistantDraft?.reasoning.length ?? 0,
    ].join(":")
  }, [messages, liveItems])

  const clearStreamControllers = () => {
    streamControllersRef.current = {}
    if (streamTickFrameRef.current !== null) {
      window.clearTimeout(streamTickFrameRef.current)
      streamTickFrameRef.current = null
    }
  }

  const loadLatest = async () => {
    try {
      clearStreamControllers()
      const response = await fetch("/api/sessions/latest", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to load latest session")
      }

      const next = data as LatestSessionResponse
      setSnapshot(next)
      setMessages(next.messages)
      setLiveItems({})
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load latest session")
    } finally {
      setLoading(false)
    }
  }

  const applyStreamMessagePatch = (
    sessionId: string,
    index: number,
    apply: (existing: TranscriptMessage | undefined) => TranscriptMessage,
    messageCount?: number,
  ) => {
    setMessages((prev) => upsertMessages(prev, [apply(findMessageByIndex(prev, index))]))

    setSnapshot((prev) => {
      if (!prev || prev.sessionId !== sessionId) return prev
      const nextMessageCount = messageCount ?? Math.max(prev.messageCount, index + 1)
      return {
        ...prev,
        messageCount: nextMessageCount,
        messages: upsertMessages(prev.messages, [apply(findMessageByIndex(prev.messages, index))]),
      } as SessionTranscript
    })
  }

  const ensureStreamController = (index: number) => {
    const existing = streamControllersRef.current[index]
    if (existing) return existing

    const controller = new ActiveItemStreamController()
    streamControllersRef.current[index] = controller
    return controller
  }

  const applyCommittedChannelDelta = (
    sessionId: string,
    index: number,
    kind: "content" | "reasoning",
    chunk: string,
  ) => {
    if (!chunk) return

    applyStreamMessagePatch(sessionId, index, (existing) => {
      const base = existing ?? createBaseMessage(index, "assistant")
      return {
        ...base,
        role: "assistant",
        content: kind === "content" ? `${base.content}${chunk}` : base.content,
        reasoning: kind === "reasoning" ? `${base.reasoning ?? ""}${chunk}` : base.reasoning,
      }
    })
  }

  const flushStreamController = (sessionId: string, index: number) => {
    const controller = streamControllersRef.current[index]
    if (!controller) return

    const { contentDelta, reasoningDelta } = controller.finalize()
    applyCommittedChannelDelta(sessionId, index, "content", contentDelta)
    applyCommittedChannelDelta(sessionId, index, "reasoning", reasoningDelta)
    delete streamControllersRef.current[index]
  }

  const flushAllStreamControllers = (sessionId: string) => {
    for (const key of Object.keys(streamControllersRef.current)) {
      flushStreamController(sessionId, Number(key))
    }
    setLiveItems({})
  }

  const scheduleStreamControllerTick = (sessionId: string) => {
    if (streamTickFrameRef.current !== null) return
    streamTickFrameRef.current = window.setTimeout(() => {
      streamTickFrameRef.current = null

      const nextLiveItems: Record<number, StreamingDraft> = {}
      let shouldContinue = false

      for (const key of Object.keys(streamControllersRef.current)) {
        const index = Number(key)
        const controller = streamControllersRef.current[index]
        const result = controller.step()

        applyCommittedChannelDelta(sessionId, index, "content", result.content.committedDelta)
        applyCommittedChannelDelta(sessionId, index, "reasoning", result.reasoning.committedDelta)

        const liveState = controller.liveState()
        if (liveState.content || liveState.reasoning) {
          nextLiveItems[index] = liveState
        }
        if (!result.isIdle) {
          shouldContinue = true
        }
      }

      setLiveItems((prev) => (draftsEqual(prev, nextLiveItems) ? prev : nextLiveItems))

      if (shouldContinue) {
        scheduleStreamControllerTick(sessionId)
      }
    }, STREAM_TICK_MS)
  }

  const handleStreamEvent = (event: ChatStreamEvent) => {
    switch (event.type) {
      case "turn/started": {
        clearStreamControllers()
        setLiveItems({})
        setSnapshot((prev) => {
          if (prev && prev.sessionId === event.threadId) {
            return {
              ...prev,
              status: "running",
              startedAt: event.startedAt,
              endedAt: null,
              error: null,
              pendingQuestion: event.pendingQuestion ?? null,
            } as SessionTranscript
          }

          const next: SessionTranscript = {
            sessionId: event.threadId,
            status: "running",
            startedAt: event.startedAt,
            endedAt: null,
            error: null,
            mtimeMs: Date.now(),
            messageCount: 0,
            messages: [],
            pendingQuestion: event.pendingQuestion ?? null,
          }
          setMessages([])
          return next
        })
        return
      }
      case "turn/updated":
      case "turn/completed": {
        if (event.type === "turn/completed") {
          flushAllStreamControllers(event.threadId)
        }
        setSnapshot((prev) => {
          if (!prev || prev.sessionId !== event.threadId) return prev
          return {
            ...prev,
            status: event.status,
            endedAt: event.endedAt,
            error: event.error,
            pendingQuestion: event.pendingQuestion ?? null,
          } as SessionTranscript
        })
        return
      }
      case "item/started": {
        const nextMessage = toTranscriptMessage(event.item)
        applyStreamMessagePatch(
          event.threadId,
          event.item.index,
          () => nextMessage,
          event.item.index + 1,
        )
        return
      }
      case "item/updated": {
        const nextMessage = toTranscriptMessage(event.item)
        if (event.item.role === "assistant") {
          applyStreamMessagePatch(event.threadId, event.item.index, (existing) => {
            const base = existing ?? createBaseMessage(event.item.index, "assistant")
            return {
              ...base,
              timestamp: nextMessage.timestamp,
              role: nextMessage.role,
              toolCalls: nextMessage.toolCalls,
              toolCallId: nextMessage.toolCallId,
              name: nextMessage.name,
            }
          })
          return
        }

        applyStreamMessagePatch(event.threadId, event.item.index, () => nextMessage)
        return
      }
      case "item/completed": {
        if (event.item.role === "assistant") {
          flushStreamController(event.threadId, event.item.index)
        }
        applyStreamMessagePatch(
          event.threadId,
          event.item.index,
          () => toTranscriptMessage(event.item),
          event.item.index + 1,
        )
        delete streamControllersRef.current[event.item.index]
        setLiveItems((prev) => {
          if (!(event.item.index in prev)) return prev
          const next = { ...prev }
          delete next[event.item.index]
          return next
        })
        return
      }
      case "item/agentMessage/delta": {
        ensureStreamController(event.index).enqueue("content", event.delta)
        scheduleStreamControllerTick(event.threadId)
        return
      }
      case "item/reasoning/delta": {
        ensureStreamController(event.index).enqueue("reasoning", event.delta)
        scheduleStreamControllerTick(event.threadId)
        return
      }
      case "error": {
        setError(event.message)
        return
      }
      case "end":
        return
    }
  }

  const readChatStream = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      while (true) {
        const newlineIndex = buffer.indexOf("\n")
        if (newlineIndex === -1) break
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (!line) continue
        handleStreamEvent(JSON.parse(line) as ChatStreamEvent)
      }
    }

    const remainder = buffer.trim()
    if (remainder) {
      handleStreamEvent(JSON.parse(remainder) as ChatStreamEvent)
    }
  }

  const handleSend = async (directMessage?: string) => {
    const text = directMessage ?? input.trim()
    if (!text || sending || isAwaitingInput) return

    activeStreamAbortRef.current?.abort()
    const abortController = new AbortController()
    activeStreamAbortRef.current = abortController

    setSending(true)
    setConnectionState("live")
    setError(null)
    if (!directMessage) setInput("")

    try {
      const response = await fetch("/api/chat/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to send message")
      }

      if (!response.body) {
        throw new Error("Stream response body is unavailable")
      }

      await readChatStream(response.body)
      await loadLatest()
    } catch (sendError) {
      if ((sendError as Error).name !== "AbortError") {
        setError(sendError instanceof Error ? sendError.message : "Failed to send message")
        await loadLatest()
      }
    } finally {
      setSending(false)
      setConnectionState("closed")
      activeStreamAbortRef.current = null
    }
  }

  useEffect(() => {
    void loadLatest()

    return () => {
      activeStreamAbortRef.current?.abort()
      clearStreamControllers()
    }
  }, [])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || !shouldAutoScrollRef.current) return
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current)
    }
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null
      scroller.scrollTop = scroller.scrollHeight
    })

    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current)
        scrollFrameRef.current = null
      }
    }
  }, [streamRenderKey])

  return (
    <div className="flex h-full flex-col bg-[#F5F0E8]">
      {(loading || error || connectionState === "live") && (
        <div className="flex items-center justify-end gap-2 px-6 pt-4 pb-1">
          {connectionState === "live" && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" style={{ boxShadow: "0 0 8px #D4AF37, 0 0 16px rgba(212,175,55,0.5)" }} />
              <span className="font-mono text-[12px] font-semibold text-[#9A7B2A]">Live</span>
            </span>
          )}
          {loading && (
            <Loader variant="text-shimmer" text="Loading" size="sm" className="text-[#8C8375]" />
          )}
          {error && (
            <span className="font-mono text-[10px] text-[#f2a6a6]/70">{error}</span>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={(event) => {
          shouldAutoScrollRef.current = isNearBottom(event.currentTarget)
        }}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center text-center">
                {/* Large compass icon */}
                <div className="relative mb-6">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)",
                      transform: "scale(1.8)",
                    }}
                  />
                  <svg width="80" height="80" viewBox="0 0 120 120" fill="none" className="relative">
                    <circle cx="60" cy="60" r="57" stroke="#d4af37" strokeWidth="0.6" opacity="0.25" />
                    <circle cx="60" cy="60" r="47" stroke="#d4af37" strokeWidth="0.8" opacity="0.4" />
                    <circle cx="60" cy="60" r="25" stroke="#d4af37" strokeWidth="1.3" fill="rgba(212,175,55,0.05)" opacity="0.7" />
                    <circle cx="60" cy="60" r="14" stroke="#d4af37" strokeWidth="0.9" fill="none" opacity="0.55" />
                    <line x1="50" y1="70" x2="70" y2="50" stroke="#d4af37" strokeWidth="1.1" opacity="0.6" />
                    <circle cx="60" cy="60" r="1.5" fill="#d4af37" opacity="0.45" />
                  </svg>
                </div>

                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9A7B2A]">
                  Meridian
                </p>

                {isOnboarding ? (
                  <>
                    <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#8C8375]">
                      Your portfolio, guided by conviction
                    </p>
                    <div className="mt-6">
                      <PromptSuggestion
                        onClick={() => void handleSend("Help me define my strategy")}
                        disabled={sending}
                        className="rounded-2xl bg-[#d4af37]/80 px-8 py-3.5 text-[15px] font-semibold text-[#1a1507] shadow-[0_4px_20px_rgba(212,175,55,0.2)] transition-all hover:bg-[#d4af37] hover:shadow-[0_4px_28px_rgba(212,175,55,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Help me define my strategy
                      </PromptSuggestion>
                    </div>
                    <p className="mt-4 text-[13px] text-[#8C8375]/70">
                      or type your own below
                    </p>
                  </>
                ) : (
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8C8375]">
                    No conversation yet. Send a message to start a session.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl pb-2">
              {renderItems.map((item) =>
                item.type === "message" ? (
                  <MemoizedMessageBubble
                    key={item.message.index}
                    message={item.message}
                    isStreaming={activeStreamingAssistantIndex === item.message.index}
                    toolResults={toolResultsMap}
                    liveItem={liveItems[item.message.index] ?? null}
                  />
                ) : snapshot?.status === "awaiting_input" &&
                  snapshot?.pendingQuestion?.id === item.data.id ? null : (
                  <CompletedAnswerCard key={`answer-${item.data.id}`} answers={item.data.answers} />
                ),
              )}

              {/* Live question panel: only for unanswered pending questions */}
              {snapshot?.status === "awaiting_input" && snapshot.pendingQuestion && snapshot.sessionId && (
                <QuestionPanel
                  key={snapshot.pendingQuestion.id}
                  pendingQuestion={snapshot.pendingQuestion}
                  sessionId={snapshot.sessionId}
                  onSubmitted={(answers) => {
                    setCompletedAnswers((prev) => [
                      ...prev,
                      {
                        id: snapshot.pendingQuestion!.id,
                        answers,
                        position: messages.length,
                      },
                    ])
                  }}
                />
              )}
            </div>
          )}
      </div>

      <div className="px-6 pb-6 pt-2">
        <PromptInput
          value={input}
          onValueChange={setInput}
          onSubmit={() => void handleSend()}
          isLoading={sending}
          disabled={isAwaitingInput}
          className="mx-auto max-w-3xl rounded-2xl border-[#c8a43a]/25 bg-white shadow-none"
        >
          <PromptInputTextarea
            placeholder={isAwaitingInput ? "Answer the question above first..." : isOnboarding ? "Describe your investment strategy..." : "Type your message..."}
            className="text-[15px] leading-relaxed text-[#2C2617] placeholder:text-[#8C8375]"
          />
          <PromptInputActions className="justify-end px-2 pb-2">
            <PromptInputAction tooltip="Send message">
              <button
                type="button"
                disabled={sending || !input.trim() || isAwaitingInput}
                onClick={() => void handleSend()}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                  sending || !input.trim() || isAwaitingInput
                    ? "cursor-not-allowed bg-[#d4af37]/40"
                    : "cursor-pointer bg-[#d4af37]/80 hover:bg-[#d4af37]"
                }`}
                aria-label="Send"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 16V4M10 4L5 9M10 4L15 9"
                    stroke="#1a1507"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}
