"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type {
  LatestSessionResponse,
  PendingQuestion,
  SessionTranscript,
  TranscriptMessage,
} from "@/lib/atlas-types"
import { MarkdownLite } from "./markdown-lite"

function isNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 64
}

function upsertMessages(
  existing: TranscriptMessage[],
  updates: TranscriptMessage[],
): TranscriptMessage[] {
  const next = [...existing]
  for (const message of updates) {
    next[message.index] = message
  }
  return next.filter((message): message is TranscriptMessage => Boolean(message))
}

/* Compass avatar for assistant messages */
function CompassAvatar() {
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
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

function MessageBubble({
  message,
  isThinkingOpen,
  isStreaming,
  onToggleThinking,
}: {
  message: TranscriptMessage
  isThinkingOpen: boolean
  isStreaming: boolean
  onToggleThinking: () => void
}) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isTool = message.role === "tool"
  const isSystem = message.role === "system"

  if (isSystem || isTool) return null

  if (isUser) {
    return (
      <div className="mb-6">
        <div className="flex justify-end">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
            You
          </p>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl border border-[#c8a43a]/10 bg-[#1A1507] px-5 py-4 lg:max-w-[70%]">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#f3ead8]">
              {message.content}
            </p>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <span className="font-mono text-[10px] text-[#8C8375]">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    )
  }

  const parsed = splitThinkBlocks(message.content)
  const reasoningText = message.reasoning ?? parsed.reasoning
  const visibleContent = parsed.visibleContent
  const hasReasoning = Boolean(reasoningText && reasoningText.length > 0)
  const suppressToolProgressBubble =
    isAssistant &&
    message.toolCalls.length > 0 &&
    Boolean(visibleContent) &&
    isToolProgressStatusText(visibleContent)

  if (suppressToolProgressBubble) return null
  if (isAssistant && !visibleContent && !hasReasoning && message.toolCalls.length > 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <CompassAvatar />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
          Meridian
        </p>
      </div>
      <div className="mt-2 space-y-2 pl-[52px]">
        {hasReasoning && (
          <div className="max-w-[85%] rounded-2xl border border-[#c8a43a]/25 bg-[#E8E0D0] lg:max-w-[70%]">
            <button
              type="button"
              onClick={onToggleThinking}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left"
            >
              <span className="font-mono text-[11px] text-[#8C8375]">
                Thought
                {isStreaming ? " · live" : ""}
              </span>
              <span className="font-mono text-[11px] text-[#8C8375]">
                {isThinkingOpen ? "▾" : "▸"}
              </span>
            </button>
            {isThinkingOpen && (
              <div className="border-t border-[#c8a43a]/20 px-4 py-3">
                <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#6B6259]">
                  {reasoningText}
                </div>
              </div>
            )}
          </div>
        )}

        {visibleContent && (
          <div className="max-w-[85%] rounded-2xl border-l-2 border-[#c8a43a]/40 bg-[#FFFFFF] px-5 py-4 text-[#2C2617] lg:max-w-[70%]">
            <MarkdownLite markdown={visibleContent} variant="atlas-gold" surface="none" className="break-words" />
          </div>
        )}
        <span className="block font-mono text-[10px] text-[#8C8375]">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

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
    <div className="mb-6 pl-[52px]">
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
  autoTriggerMessage?: string
  onAutoTriggerFired?: () => void
}

export function ChatScreen({ autoTriggerMessage, onAutoTriggerFired }: ChatScreenProps = {}) {
  const [snapshot, setSnapshot] = useState<LatestSessionResponse | null>(null)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [latestLoaded, setLatestLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "closed">(
    "connecting",
  )
  const [expandedThinkingByIndex, setExpandedThinkingByIndex] = useState<Record<number, boolean>>(
    {},
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const previousStreamingAssistantIndexRef = useRef<number | null>(null)
  const autoTriggerFiredRef = useRef(false)

  const activeStreamingAssistantIndex = useMemo(() => {
    if (!snapshot || snapshot.status !== "running") return null
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant") {
        return messages[i].index
      }
    }
    return null
  }, [messages, snapshot])

  const streamRenderKey = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")
    return [
      messages.length,
      lastAssistant?.index ?? -1,
      lastAssistant?.content.length ?? 0,
      lastAssistant?.reasoning?.length ?? 0,
    ].join(":")
  }, [messages])

  useEffect(() => {
    const previous = previousStreamingAssistantIndexRef.current

    if (previous !== null && previous !== activeStreamingAssistantIndex) {
      setExpandedThinkingByIndex((prev) => ({
        ...prev,
        [previous]: false,
      }))
    }

    if (activeStreamingAssistantIndex !== null) {
      setExpandedThinkingByIndex((prev) => ({
        ...prev,
        [activeStreamingAssistantIndex]: true,
      }))
    }

    previousStreamingAssistantIndexRef.current = activeStreamingAssistantIndex
  }, [activeStreamingAssistantIndex])

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
      ...messages.map((m, i): Item => ({ type: "message", message: m, sortKey: i })),
      ...completedAnswers.map((a): Item => ({ type: "answer", data: a, sortKey: a.position - 0.5 })),
    ]

    items.sort((a, b) => a.sortKey - b.sortKey)
    return items
  }, [messages, completedAnswers])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || isAwaitingInput) return

    setSending(true)
    setInput("")
    try {
      const res = await fetch("/api/agent/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to send message")
      }
    } catch {
      setError("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    let mounted = true
    let source: EventSource | null = null

    const loadLatest = async () => {
      try {
        const response = await fetch("/api/sessions/latest", { cache: "no-store" })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to load latest session")
        }

        if (!mounted) return
        const next = data as LatestSessionResponse
        setSnapshot(next)
        setMessages(next.messages)
        setError(null)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : "Failed to load latest session")
      } finally {
        if (mounted) {
          setLoading(false)
          setLatestLoaded(true)
        }
      }
    }

    const connectStream = () => {
      source = new EventSource("/api/sessions/stream")
      setConnectionState("connecting")

      source.addEventListener("connected", () => {
        if (!mounted) return
        setConnectionState("live")
      })

      source.addEventListener("session", (event) => {
        if (!mounted) return
        const next = JSON.parse((event as MessageEvent).data) as LatestSessionResponse
        setSnapshot(next)
        setMessages(next.messages)
      })

      source.addEventListener("messages", (event) => {
        if (!mounted) return
        const payload = JSON.parse((event as MessageEvent).data) as {
          sessionId: string
          messageCount: number
          messages: TranscriptMessage[]
        }

        setMessages((prev) => upsertMessages(prev, payload.messages))

        setSnapshot((prev) => {
          if (!prev || prev.sessionId !== payload.sessionId) return prev
          return {
            ...prev,
            messageCount: payload.messageCount,
            messages: upsertMessages(prev.messages, payload.messages),
          } as SessionTranscript
        })
      })

      source.addEventListener("status", (event) => {
        if (!mounted) return
        const payload = JSON.parse((event as MessageEvent).data) as {
          sessionId: string
          status: SessionTranscript["status"]
          endedAt: string | null
          error: string | null
          pendingQuestion?: PendingQuestion | null
        }

        setSnapshot((prev) => {
          if (!prev || prev.sessionId !== payload.sessionId) return prev
          return {
            ...prev,
            status: payload.status,
            endedAt: payload.endedAt,
            error: payload.error,
            pendingQuestion: payload.pendingQuestion ?? null,
          } as SessionTranscript
        })
      })

      source.onerror = () => {
        if (!mounted) return
        setConnectionState("closed")
      }
    }

    void loadLatest()
    connectStream()

    return () => {
      mounted = false
      source?.close()
    }
  }, [])

  // Auto-trigger onboarding message when SSE connects and no messages exist
  useEffect(() => {
    if (
      !autoTriggerMessage ||
      autoTriggerFiredRef.current ||
      !latestLoaded ||
      connectionState !== "live" ||
      messages.length > 0
    ) {
      return
    }
    autoTriggerFiredRef.current = true
    onAutoTriggerFired?.()
    void (async () => {
      try {
        await fetch("/api/agent/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: autoTriggerMessage }),
        })
      } catch {
        // Silently fail — user can still type manually
      }
    })()
  }, [autoTriggerMessage, connectionState, latestLoaded, messages.length, onAutoTriggerFired])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || !shouldAutoScrollRef.current) return
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" })
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
            <span className="font-mono text-[10px] text-[#8C8375]">Loading...</span>
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
            <div className="text-center">
              <div className="mx-auto mb-4">
                <CompassAvatar />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9A7B2A]">
                Meridian
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#8C8375]">
                No conversation yet. Send a message to start a session.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl pb-2">
            {renderItems.map((item) =>
              item.type === "message" ? (
                <MessageBubble
                  key={`${item.message.index}-${item.message.timestamp}-${item.message.role}`}
                  message={item.message}
                  isStreaming={activeStreamingAssistantIndex === item.message.index}
                  isThinkingOpen={Boolean(expandedThinkingByIndex[item.message.index])}
                  onToggleThinking={() => {
                    setExpandedThinkingByIndex((prev) => ({
                      ...prev,
                      [item.message.index]: !prev[item.message.index],
                    }))
                  }}
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
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <div className={`flex-1 rounded-2xl border border-[#c8a43a]/25 bg-[#FFFFFF] px-5 py-4 ${isAwaitingInput ? "opacity-50" : ""}`}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              placeholder={isAwaitingInput ? "Answer the question above first..." : "Type your message..."}
              rows={1}
              disabled={isAwaitingInput}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#2C2617] placeholder:text-[#8C8375] focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            disabled={sending || !input.trim() || isAwaitingInput}
            onClick={() => void handleSend()}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
              sending || !input.trim() || isAwaitingInput
                ? "cursor-not-allowed bg-[#d4af37]/40"
                : "cursor-pointer bg-[#d4af37]/80 hover:bg-[#d4af37]"
            }`}
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 16V4M10 4L5 9M10 4L15 9"
                stroke="#1a1507"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
