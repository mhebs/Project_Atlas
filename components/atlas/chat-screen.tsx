"use client"

import { useEffect, useRef, useState } from "react"
import type { LatestSessionResponse, SessionTranscript, TranscriptMessage } from "@/lib/atlas-types"

function isNearBottom(element: HTMLDivElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 64
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

/* Strip common markdown formatting for clean display */
function cleanMarkdown(text: string) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/^\|[\s\S]*?\|$/gm, (match) => {
      /* Convert table rows to readable text, skip separator rows */
      if (/^\|\s*[-:]+/.test(match)) return ""
      return match
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join("  ·  ")
    })
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function MessageBubble({ message }: { message: TranscriptMessage }) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isTool = message.role === "tool"
  const isSystem = message.role === "system"

  /* Hide system and tool messages for a clean conversational view */
  if (isSystem || isTool) return null

  /* User message */
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
              {message.content || "(no content)"}
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

  /* Strip <think> blocks and markdown formatting from assistant content */
  const visibleContent = isAssistant
    ? cleanMarkdown(message.content)
    : message.content

  /* Skip assistant messages that are only think blocks / tool calls with no visible text */
  if (isAssistant && !visibleContent && message.toolCalls.length > 0) return null

  /* Assistant message */
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <CompassAvatar />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9b248]/85">
          Meridian
        </p>
      </div>
      <div className="mt-2 pl-[52px]">
        <div className="max-w-[85%] rounded-2xl border-l-2 border-[#c8a43a]/20 bg-[#13110e]/80 px-5 py-4 lg:max-w-[70%]">
          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#d9d1c3]/90">
            {visibleContent || "(no content)"}
          </div>
        </div>
        <span className="mt-2 block font-mono text-[10px] text-[#d9d1c3]/40">
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "closed">(
    "connecting",
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

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

        setMessages((prev) => {
          const next = [...prev]
          for (const message of payload.messages) {
            if (typeof next[message.index] === "undefined") {
              next.push(message)
            } else {
              next[message.index] = message
            }
          }
          return next
        })

        setSnapshot((prev) => {
          if (!prev || prev.sessionId !== payload.sessionId) return prev
          return {
            ...prev,
            messageCount: payload.messageCount,
            messages: [...prev.messages, ...payload.messages],
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
  }, [messages.length])

  return (
    <div className="flex h-full flex-col bg-[#060606]">
      {/* Status bar — minimal */}
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

      {/* Messages */}
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
                No conversation yet. Run the agent to start a session and messages will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl pb-2">
            {messages.map((message) => (
              <MessageBubble
                key={`${message.index}-${message.timestamp}-${message.role}`}
                message={message}
              />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-6 pb-6 pt-2">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <div className="flex-1 rounded-2xl border border-[#c8a43a]/15 bg-[#13110e]/80 px-5 py-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your response..."
              rows={1}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#f7eedb] placeholder:text-[#d9d1c3]/35 focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled
            className="flex h-12 w-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-[#d4af37]/80 transition-colors"
            aria-label="Send"
            title="Send is disabled in phase 1"
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
