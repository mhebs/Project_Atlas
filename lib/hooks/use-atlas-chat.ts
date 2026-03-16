"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import type {
  LatestSessionResponse,
  PendingQuestion,
  TranscriptMessage,
} from "@/lib/atlas-types"

/**
 * Convert a TranscriptMessage[] (from the session file) into UIMessage[]
 * that useChat can render.
 */
function transcriptToUIMessages(
  transcript: TranscriptMessage[],
  sessionId: string | null,
): UIMessage[] {
  const uiMessages: UIMessage[] = []

  for (const msg of transcript) {
    if (msg.role === "system" || msg.role === "tool") continue

    const parts: UIMessage["parts"] = []

    if (msg.role === "user") {
      if (msg.content) {
        parts.push({ type: "text", text: msg.content })
      }
      uiMessages.push({
        id: `${sessionId ?? "s"}:${msg.index}`,
        role: "user",
        parts,
      })
      continue
    }

    // assistant
    if (msg.reasoning) {
      parts.push({
        type: "reasoning",
        text: msg.reasoning,
        providerMetadata: {},
      })
    }

    for (const tc of msg.toolCalls) {
      const toolResultMsg = transcript.find(
        (m) => m.role === "tool" && m.toolCallId === tc.id,
      )

      let parsedArgs: unknown = {}
      try {
        parsedArgs = JSON.parse(tc.arguments)
      } catch {
        // keep empty
      }

      if (toolResultMsg) {
        parts.push({
          type: "dynamic-tool",
          toolCallId: tc.id,
          toolName: tc.name,
          state: "output-available",
          input: parsedArgs,
          output: toolResultMsg.content,
        } as unknown as UIMessage["parts"][number])
      } else {
        parts.push({
          type: "dynamic-tool",
          toolCallId: tc.id,
          toolName: tc.name,
          state: "input-available",
          input: parsedArgs,
        } as unknown as UIMessage["parts"][number])
      }
    }

    if (msg.content) {
      parts.push({ type: "text", text: msg.content })
    }

    if (parts.length > 0) {
      uiMessages.push({
        id: `${sessionId ?? "s"}:${msg.index}`,
        role: "assistant",
        parts,
      })
    }
  }

  return uiMessages
}

export interface UseAtlasChatReturn {
  messages: UIMessage[]
  status: "submitted" | "streaming" | "ready" | "error"
  error: Error | undefined
  sendMessage: (options: { text: string }) => void
  stop: () => void
  setMessages: (messages: UIMessage[]) => void
  isLoading: boolean
  sessionLoading: boolean
  sessionId: string | null
  pendingQuestion: PendingQuestion | null
  isAwaitingInput: boolean
  submitAnswer: (
    sessionId: string,
    questionId: string,
    answers: Record<string, string>,
  ) => Promise<boolean>
}

const chatTransport = new DefaultChatTransport({ api: "/api/chat" })

export function useAtlasChat(): UseAtlasChatReturn {
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null)
  const [isAwaitingInput, setIsAwaitingInput] = useState(false)
  const sessionLoadedRef = useRef(false)

  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    setMessages,
  } = useChat({
    id: "atlas-main",
    transport: chatTransport,
    experimental_throttle: 16,
    onFinish: () => {
      void reloadSession()
    },
  })

  const reloadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/latest", { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as LatestSessionResponse

      setSessionId(data.sessionId)
      setIsAwaitingInput(data.status === "awaiting_input")
      setPendingQuestion(data.pendingQuestion ?? null)
    } catch {
      // ignore
    }
  }, [])

  // Load session on mount
  useEffect(() => {
    if (sessionLoadedRef.current) return
    sessionLoadedRef.current = true

    async function loadSession() {
      try {
        const res = await fetch("/api/sessions/latest", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as LatestSessionResponse

        setSessionId(data.sessionId)
        setIsAwaitingInput(data.status === "awaiting_input")
        setPendingQuestion(data.pendingQuestion ?? null)

        if (data.messages.length > 0) {
          const uiMessages = transcriptToUIMessages(data.messages, data.sessionId)
          setMessages(uiMessages)
        }
      } catch {
        // ignore
      } finally {
        setSessionLoading(false)
      }
    }

    void loadSession()
  }, [setMessages, reloadSession])

  // Detect pending questions from custom data parts in streamed messages
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue
      for (const part of msg.parts) {
        if (
          "type" in part &&
          (part as { type: string }).type === "data-pending-question" &&
          "data" in part
        ) {
          const pq = (part as { data: unknown }).data as PendingQuestion
          if (pq && typeof pq === "object" && "id" in pq && "questions" in pq) {
            setPendingQuestion(pq)
            setIsAwaitingInput(true)
          }
        }
      }
    }
  }, [messages])

  const submitAnswer = useCallback(
    async (
      sid: string,
      questionId: string,
      answers: Record<string, string>,
    ): Promise<boolean> => {
      try {
        const res = await fetch("/api/sessions/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            questionId,
            answers,
          }),
        })
        if (res.ok) {
          setPendingQuestion(null)
          setIsAwaitingInput(false)
          return true
        }
        return false
      } catch {
        return false
      }
    },
    [],
  )

  const isLoading = status === "submitted" || status === "streaming"

  return {
    messages,
    status,
    error,
    sendMessage,
    stop,
    setMessages,
    isLoading,
    sessionLoading,
    sessionId,
    pendingQuestion,
    isAwaitingInput,
    submitAnswer,
  }
}
