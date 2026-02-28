"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { LatestSessionResponse, SessionTranscript, TranscriptMessage } from "@/lib/atlas-types"
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

function splitThinkBlocks(content: string): { reasoning: string | null; visibleContent: string } {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi
  const reasoningParts: string[] = []
  let match: RegExpExecArray | null = null

  while ((match = thinkRegex.exec(content)) !== null) {
    const part = (match[1] || "").trim()
    if (part) reasoningParts.push(part)
  }

  const visibleContent = content.replace(thinkRegex, "").trim()
  return {
    reasoning: reasoningParts.length > 0 ? reasoningParts.join("\n\n") : null,
    visibleContent,
  }
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
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9b248]/75">
            You
          </p>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl border border-[#c8a43a]/10 bg-[#1e1c17]/80 px-5 py-4 lg:max-w-[70%]">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#f3ead8]">
              {message.content}
            </p>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <span className="font-mono text-[10px] text-[#d9d1c3]/40">
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
  if (isAssistant && !visibleContent && !hasReasoning && message.toolCalls.length > 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <CompassAvatar />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9b248]/85">
          Meridian
        </p>
      </div>
      <div className="mt-2 space-y-2 pl-[52px]">
        {hasReasoning && (
          <div className="max-w-[85%] rounded-2xl border border-[#2b3140]/45 bg-[#0b1018]/65 lg:max-w-[70%]">
            <button
              type="button"
              onClick={onToggleThinking}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left"
            >
              <span className="font-mono text-[11px] text-[#8a93a6]/70">
                Thought
                {isStreaming ? " · live" : ""}
              </span>
              <span className="font-mono text-[11px] text-[#7d8698]/55">
                {isThinkingOpen ? "▾" : "▸"}
              </span>
            </button>
            {isThinkingOpen && (
              <div className="border-t border-[#2f3546]/55 px-4 py-3">
                <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#7f889b]/68">
                  {reasoningText}
                </div>
              </div>
            )}
          </div>
        )}

        {visibleContent && (
          <div className="max-w-[85%] rounded-2xl border-l-2 border-[#c8a43a]/20 bg-[#13110e]/80 px-5 py-4 lg:max-w-[70%]">
            <MarkdownLite markdown={visibleContent} variant="atlas-gold" surface="none" className="break-words" />
          </div>
        )}
        <span className="block font-mono text-[10px] text-[#d9d1c3]/40">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

export function ChatScreen() {
  const [snapshot, setSnapshot] = useState<LatestSessionResponse | null>(null)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
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

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

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
        if (mounted) setLoading(false)
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
        }

        setSnapshot((prev) => {
          if (!prev || prev.sessionId !== payload.sessionId) return prev
          return {
            ...prev,
            status: payload.status,
            endedAt: payload.endedAt,
            error: payload.error,
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

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || !shouldAutoScrollRef.current) return
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" })
  }, [streamRenderKey])

  return (
    <div className="flex h-full flex-col bg-[#060606]">
      {(loading || error || connectionState === "live") && (
        <div className="flex items-center justify-end gap-2 px-6 pt-4 pb-1">
          {connectionState === "live" && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3d6b4f]" />
              <span className="font-mono text-[10px] text-[#d9d1c3]/35">Live</span>
            </span>
          )}
          {loading && (
            <span className="font-mono text-[10px] text-[#d9d1c3]/35">Loading...</span>
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
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#d9b248]/60">
                Meridian
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#d9d1c3]/50">
                No conversation yet. Send a message to start a session.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl pb-2">
            {messages.map((message) => (
              <MessageBubble
                key={`${message.index}-${message.timestamp}-${message.role}`}
                message={message}
                isStreaming={activeStreamingAssistantIndex === message.index}
                isThinkingOpen={Boolean(expandedThinkingByIndex[message.index])}
                onToggleThinking={() => {
                  setExpandedThinkingByIndex((prev) => ({
                    ...prev,
                    [message.index]: !prev[message.index],
                  }))
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 pt-2">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <div className="flex-1 rounded-2xl border border-[#c8a43a]/15 bg-[#13110e]/80 px-5 py-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Type your message..."
              rows={1}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#f7eedb] placeholder:text-[#d9d1c3]/35 focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={sending || !input.trim()}
            onClick={() => void handleSend()}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
              sending || !input.trim()
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
