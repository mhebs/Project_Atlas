"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import type { UIMessage } from "ai"
import type { PendingQuestion } from "@/lib/atlas-types"
import { useAtlasChat } from "@/lib/hooks/use-atlas-chat"
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

/* ------------------------------------------------------------------ */
/*  Shared helpers (ported from v1)                                     */
/* ------------------------------------------------------------------ */

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

function formatTime(date: Date | string | undefined) {
  if (!date) return ""
  return new Date(date).toLocaleTimeString([], {
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
  if (!name) return "Tool"
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
  const iconClass = "h-4 w-4 text-[#9A7B2A]"
  if (!name) {
    return (
      <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="3" /><path d="M3 3l2.5 2.5M10.5 10.5L13 13M13 3l-2.5 2.5M3 13l2.5-2.5" />
      </svg>
    )
  }
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
  return (
    <svg className={iconClass} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
    </svg>
  )
}

function parseToolArgs(argsJson: unknown): string | null {
  try {
    const parsed = typeof argsJson === "string" ? JSON.parse(argsJson) : argsJson
    if (!parsed || typeof parsed !== "object") return null
    const obj = parsed as Record<string, unknown>
    if (obj.path) return String(obj.path)
    if (obj.file_path) return String(obj.file_path)
    if (obj.query) return String(obj.query)
    if (obj.command) return String(obj.command)
    if (obj.question) return String(obj.question)
    if (obj.result) return typeof obj.result === "string" ? obj.result.slice(0, 120) : null
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
      return { title: `Thinking step ${index + 1}`, items: bulletItems }
    }

    return { title: `Thinking step ${index + 1}`, items: [section] }
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

/* ------------------------------------------------------------------ */
/*  Tool part type guard                                                */
/* ------------------------------------------------------------------ */

interface DynamicToolPart {
  type: "dynamic-tool"
  toolCallId: string
  toolName: string
  state: string
  input?: unknown
  output?: unknown
  errorText?: string
}

function isDynamicToolPart(part: unknown): part is DynamicToolPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as { type: string }).type === "dynamic-tool" &&
    "toolCallId" in part
  )
}

/**
 * Normalize any tool-related part into a DynamicToolPart shape.
 * Handles:
 *   - dynamic-tool  → toolName lives at top level
 *   - tool-invocation → toolName lives inside toolInvocation
 *   - tool-call / tool-result → toolName at top level
 */
function isToolPart(part: unknown): part is DynamicToolPart {
  if (isDynamicToolPart(part)) return true

  if (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    typeof (part as { type: string }).type === "string" &&
    "toolCallId" in part
  ) {
    const p = part as Record<string, unknown>
    const ptype = p.type as string

    // tool-invocation parts nest the name inside toolInvocation
    if (ptype === "tool-invocation" && typeof p.toolInvocation === "object" && p.toolInvocation !== null) {
      const inv = p.toolInvocation as Record<string, unknown>
      if (!p.toolName && inv.toolName) {
        p.toolName = inv.toolName
      }
      if (p.state === undefined && inv.state) {
        p.state = inv.state
      }
      if (p.input === undefined && inv.args) {
        p.input = inv.args
      }
      if (p.output === undefined && inv.result !== undefined) {
        p.output = inv.result
      }
      return true
    }

    // tool-call, tool-result, or other tool-* types with toolName at top level
    if (ptype.startsWith("tool-") && p.toolName) {
      return true
    }
  }
  return false
}

/* ------------------------------------------------------------------ */
/*  Message rendering                                                   */
/* ------------------------------------------------------------------ */

function AssistantMessage({
  message,
  isStreaming,
}: {
  message: UIMessage
  isStreaming: boolean
}) {
  // Collect parts by type
  const textParts: Array<{ text: string }> = []
  const reasoningParts: Array<{ text: string }> = []
  const toolParts: DynamicToolPart[] = []

  for (const part of message.parts) {
    if (part.type === "text") {
      textParts.push(part)
    } else if (part.type === "reasoning") {
      reasoningParts.push(part)
    } else if (isToolPart(part)) {
      toolParts.push(part as DynamicToolPart)
    }
  }

  // Combine all text content
  const rawContent = textParts.map((p) => p.text).join("")
  const parsed = splitThinkBlocks(rawContent)
  const reasoningFromParts = reasoningParts.map((p) => p.text).join("\n\n")
  const reasoningText = reasoningFromParts || parsed.reasoning || null
  const visibleContent = parsed.visibleContent

  const hasReasoning = Boolean(reasoningText && reasoningText.length > 0)
  const hasToolCalls = toolParts.length > 0
  const hasChain = hasReasoning || hasToolCalls

  const suppressToolProgressBubble =
    hasToolCalls &&
    Boolean(visibleContent) &&
    isToolProgressStatusText(visibleContent)

  if (!hasChain && !visibleContent) {
    if (isStreaming) {
      return (
        <Message className="justify-start">
          <CompassAvatar />
          <div className="max-w-[85%] min-w-0 flex-1 sm:max-w-[75%]">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
              Meridian
            </p>
            <Loader variant="typing" size="sm" className="text-[#d4af37]" />
          </div>
        </Message>
      )
    }
    return null
  }

  const reasoningSteps = hasReasoning && reasoningText ? parseReasoningSteps(reasoningText) : []
  const isThinking = isStreaming && hasReasoning && !hasToolCalls

  return (
    <Message className="justify-start">
      <CompassAvatar />
      <div className="max-w-[85%] min-w-0 flex-1 sm:max-w-[75%]">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
          Meridian
        </p>
        <div className="space-y-2">
          {hasChain && (
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

              {toolParts.map((tp) => {
                const hasResult = tp.state === "output-available" || tp.state === "result"
                const argDetail = parseToolArgs(tp.input)
                const isRunning = !hasResult && isStreaming
                const resultText = String(tp.output ?? "")

                return (
                  <ChainOfThoughtStep key={tp.toolCallId}>
                    <ChainOfThoughtTrigger
                      leftIcon={toolCallIcon(tp.toolName)}
                      className="font-mono text-[12px] text-[#8C8375] hover:text-[#2C2617]"
                    >
                      {toolCallLabel(tp.toolName)}
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
                      {hasResult ? (
                        <ChainOfThoughtItem className="max-h-40 overflow-y-auto rounded-lg bg-[#F5F0E8] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#6B6259]">
                          <pre className="whitespace-pre-wrap break-words">
                            {resultText.slice(0, 800)}
                            {resultText.length > 800 ? "..." : ""}
                          </pre>
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
          )}

          {visibleContent && !suppressToolProgressBubble && (
            <div className="rounded-2xl border-l-2 border-[#c8a43a]/40 bg-[#FFFFFF] px-5 py-4">
              <StreamingMarkdown
                id={`msg-${message.id}`}
                committed={visibleContent}
                liveTail=""
                className="space-y-4 break-words"
                components={atlasMarkdownComponents}
              />
            </div>
          )}

          {isStreaming && !visibleContent && !hasChain && (
            <Loader variant="typing" size="sm" className="text-[#d4af37]" />
          )}

          <span className="block font-mono text-[10px] text-[#8C8375]">
            {formatTime((message.metadata as { timestamp?: string } | undefined)?.timestamp)}
          </span>
        </div>
      </div>
    </Message>
  )
}

const MemoizedAssistantMessage = memo(
  AssistantMessage,
  (prev, next) =>
    prev.message === next.message && prev.isStreaming === next.isStreaming,
)

function UserMessage({ message }: { message: UIMessage }) {
  const textContent = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")

  return (
    <Message className="justify-end">
      <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%]">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
          You
        </p>
        <div className="rounded-2xl border border-[#c8a43a]/10 bg-[#1A1507] px-5 py-4">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#f3ead8]">
            {textContent}
          </p>
        </div>
        <span className="mt-2 font-mono text-[10px] text-[#8C8375]">
          {formatTime((message.metadata as { timestamp?: string } | undefined)?.timestamp)}
        </span>
      </div>
    </Message>
  )
}

/* ------------------------------------------------------------------ */
/*  Question Panel (ported from v1)                                     */
/* ------------------------------------------------------------------ */

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
  const totalSteps = questions.length + 1
  const [activeTab, setActiveTab] = useState(0)
  const [selections, setSelections] = useState<Record<number, Set<number>>>({})
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
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
    if (!multiSelect) setPendingAdvance(qIndex)
  }

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
          <button type="button" onClick={goBack} disabled={activeTab === 0 || submitted} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9A7B2A] transition-colors hover:bg-[#F5F0E8] disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Previous">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {questions.map((_, qIndex) => {
              const answered = isQuestionAnswered(qIndex)
              const isCurrent = activeTab === qIndex && !submitted
              return (
                <button key={qIndex} type="button" onClick={() => !submitted && setActiveTab(qIndex)} disabled={submitted} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors ${isCurrent ? "bg-[#c8a43a]/15 text-[#2C2617] font-medium" : "text-[#8C8375] hover:bg-[#F5F0E8] disabled:hover:bg-transparent"}`}>
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${answered ? "border-[#9A7B2A] bg-[#9A7B2A] text-white" : isCurrent ? "border-[#c8a43a]/40" : "border-[#c8a43a]/25"}`}>
                    {answered && (<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
                  </span>
                  {tabLabel(qIndex)}
                </button>
              )
            })}

            <button type="button" onClick={() => !submitted && setActiveTab(questions.length)} disabled={submitted} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors ${isSubmitTab || submitted ? "bg-[#c8a43a]/15 text-[#2C2617] font-medium" : "text-[#8C8375] hover:bg-[#F5F0E8]"}`}>
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${submitted ? "border-[#9A7B2A] bg-[#9A7B2A] text-white" : isSubmitTab ? "border-[#c8a43a]/40" : "border-[#c8a43a]/25"}`}>
                {submitted && (<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
              </span>
              Submit
            </button>
          </div>

          <button type="button" onClick={goForward} disabled={activeTab === totalSteps - 1 || submitted} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9A7B2A] transition-colors hover:bg-[#F5F0E8] disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Next">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 3L9.5 7L5.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        {/* Tab body */}
        <div className="p-5">
          {submitted ? (
            <div>
              <p className="mb-4 text-[15px] font-medium text-[#2C2617]">Answers submitted</p>
              <div className="space-y-3">
                {questions.map((q, qIndex) => (
                  <div key={qIndex}>
                    <p className="text-[13px] text-[#8C8375]">{q.question}</p>
                    <p className="mt-0.5 text-[14px] font-medium text-[#9A7B2A]">&rarr; {getAnswerSummary(qIndex)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-[11px] text-[#8C8375]">Waiting for Meridian to continue...</p>
            </div>
          ) : !isSubmitTab ? (
            (() => {
              const q = questions[activeTab]
              return (
                <div>
                  <p className="mb-4 text-[15px] font-medium leading-relaxed text-[#2C2617]">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = selections[activeTab]?.has(optIndex) ?? false
                      return (
                        <button key={optIndex} type="button" onClick={() => selectOption(activeTab, optIndex, q.multiSelect)} className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${isSelected ? "border-[#c8a43a]/40 bg-[#c8a43a]/10" : "border-[#c8a43a]/15 bg-[#F5F0E8] hover:border-[#c8a43a]/25"}`}>
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${q.multiSelect ? "rounded-sm" : "rounded-full"} ${isSelected ? "border-[#d4af37] bg-[#d4af37]" : "border-[#c8a43a]/30"}`}>
                            {isSelected && (<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#1a1507" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
                          </span>
                          <div>
                            <p className="text-[14px] font-medium text-[#2C2617]">{opt.label}</p>
                            <p className="mt-0.5 text-[13px] text-[#8C8375]">{opt.description}</p>
                          </div>
                        </button>
                      )
                    })}
                    <div className="flex items-center gap-3 rounded-xl border border-[#c8a43a]/15 bg-[#F5F0E8] px-4 py-3">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-[#c8a43a]/30" />
                      <input type="text" placeholder="Other..." value={otherTexts[activeTab] ?? ""} onChange={(e) => setOtherTexts((prev) => ({ ...prev, [activeTab]: e.target.value }))} className="w-full bg-transparent text-[14px] text-[#2C2617] placeholder:text-[#8C8375] focus:outline-none" />
                    </div>
                  </div>
                  {q.multiSelect && (
                    <button type="button" onClick={goForward} className="mt-4 rounded-lg bg-[#F5F0E8] px-4 py-2 font-mono text-[11px] text-[#9A7B2A] transition-colors hover:bg-[#EDE5D3]">
                      Next &rarr;
                    </button>
                  )}
                </div>
              )
            })()
          ) : (
            <div>
              <p className="mb-4 text-[15px] font-medium text-[#2C2617]">Review your answers</p>
              <div className="space-y-3">
                {questions.map((q, qIndex) => (
                  <div key={qIndex}>
                    <p className="text-[13px] text-[#8C8375]">{q.question}</p>
                    <p className="mt-0.5 text-[14px] font-medium text-[#9A7B2A]">&rarr; {getAnswerSummary(qIndex)}</p>
                  </div>
                ))}
              </div>
              {submitError && (<p className="mt-3 font-mono text-[11px] text-red-600">{submitError}</p>)}
              <button type="button" disabled={submitting} onClick={() => void handleSubmit()} className={`mt-5 rounded-xl px-6 py-2.5 font-mono text-[12px] uppercase tracking-wider transition-colors ${submitting ? "cursor-not-allowed bg-[#d4af37]/30 text-[#1a1507]/60" : "cursor-pointer bg-[#d4af37]/80 text-[#1a1507] hover:bg-[#d4af37]"}`}>
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
              <p className="mt-0.5 text-[14px] font-medium text-[#9A7B2A]">&rarr; {answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main ChatScreenV2                                                   */
/* ------------------------------------------------------------------ */

function isNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 64
}

interface ChatScreenV2Props {
  isOnboarding?: boolean
}

export function ChatScreenV2({ isOnboarding }: ChatScreenV2Props = {}) {
  const {
    messages,
    status,
    error,
    sendMessage,
    isLoading,
    sessionLoading,
    sessionId,
    pendingQuestion,
    isAwaitingInput,
  } = useAtlasChat()

  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const scrollFrameRef = useRef<number | null>(null)

  const [completedAnswers, setCompletedAnswers] = useState<
    Array<{ id: string; answers: Record<string, string>; afterMessageId: string }>
  >([])

  const isStreaming = status === "streaming"
  const isSubmitted = status === "submitted"

  // Find the last assistant message id for streaming indicator
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") return messages[i].id
    }
    return null
  }, [messages])

  const handleSend = (directMessage?: string) => {
    const text = directMessage ?? input.trim()
    if (!text || isLoading || isAwaitingInput) return
    sendMessage({ text })
    setInput("")
  }

  // Auto-send seed message from strategy creation flow
  const hasSentSeed = useRef(false)
  useEffect(() => {
    if (!isOnboarding || messages.length > 0 || sessionLoading || hasSentSeed.current) return
    const seed = localStorage.getItem("atlas:strategy_seed")
    if (seed) {
      hasSentSeed.current = true
      localStorage.removeItem("atlas:strategy_seed")
      sendMessage({ text: seed })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnboarding, messages.length, sessionLoading])

  // Auto-scroll
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
  }, [messages, status])

  const connectionLive = isStreaming || isSubmitted

  return (
    <div className="flex h-full flex-col bg-[#F5F0E8]">
      {(sessionLoading || error || connectionLive) && (
        <div className="flex items-center justify-end gap-2 px-6 pt-4 pb-1">
          {connectionLive && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" style={{ boxShadow: "0 0 8px #D4AF37, 0 0 16px rgba(212,175,55,0.5)" }} />
              <span className="font-mono text-[12px] font-semibold text-[#9A7B2A]">Live</span>
            </span>
          )}
          {sessionLoading && (
            <Loader variant="text-shimmer" text="Loading" size="sm" className="text-[#8C8375]" />
          )}
          {error && (
            <span className="font-mono text-[10px] text-[#f2a6a6]/70">{error.message}</span>
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
        {messages.length === 0 && !sessionLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center text-center">
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
                      onClick={() => handleSend("Help me define my strategy")}
                      disabled={isLoading}
                      className="rounded-2xl bg-[#d4af37]/80 px-8 py-3.5 text-[15px] font-semibold text-[#1a1507] shadow-[0_4px_20px_rgba(212,175,55,0.2)] transition-all hover:bg-[#d4af37] hover:shadow-[0_4px_28px_rgba(212,175,55,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Help me define my strategy
                    </PromptSuggestion>
                  </div>
                  <p className="mt-4 text-[13px] text-[#8C8375]/70">or type your own below</p>
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
            {messages.map((message) => {
              if (message.role === "user") {
                return <UserMessage key={message.id} message={message} />
              }
              if (message.role === "assistant") {
                const isThisStreaming =
                  (isStreaming || isSubmitted) && message.id === lastAssistantId
                return (
                  <MemoizedAssistantMessage
                    key={message.id}
                    message={message}
                    isStreaming={isThisStreaming}
                  />
                )
              }
              return null
            })}

            {/* Completed answers */}
            {completedAnswers.map((a) => (
              <CompletedAnswerCard key={`answer-${a.id}`} answers={a.answers} />
            ))}

            {/* Live question panel */}
            {isAwaitingInput && pendingQuestion && sessionId && (
              <QuestionPanel
                key={pendingQuestion.id}
                pendingQuestion={pendingQuestion}
                sessionId={sessionId}
                onSubmitted={(answers) => {
                  setCompletedAnswers((prev) => [
                    ...prev,
                    {
                      id: pendingQuestion.id,
                      answers,
                      afterMessageId: messages[messages.length - 1]?.id ?? "",
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
          onSubmit={() => handleSend()}
          isLoading={isLoading}
          disabled={isAwaitingInput}
          className="mx-auto max-w-3xl rounded-2xl border-[#c8a43a]/25 bg-white shadow-none"
        >
          <PromptInputTextarea
            placeholder={
              isAwaitingInput
                ? "Answer the question above first..."
                : isOnboarding
                  ? "Describe your investment strategy..."
                  : "Type your message..."
            }
            className="text-[15px] leading-relaxed text-[#2C2617] placeholder:text-[#8C8375]"
          />
          <PromptInputActions className="justify-end px-2 pb-2">
            <PromptInputAction tooltip="Send message">
              <button
                type="button"
                disabled={isLoading || !input.trim() || isAwaitingInput}
                onClick={() => handleSend()}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isLoading || !input.trim() || isAwaitingInput
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
