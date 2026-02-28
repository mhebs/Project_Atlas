import { getLatestSessionFile, getLatestSessionSnapshot, readSessionSnapshot } from "@/lib/server/sessions"
import type { TranscriptMessage } from "@/lib/atlas-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PollState = {
  sessionId: string | null
  messageCount: number
  status: string | null
  endedAt: string | null
  messageSignatures: string[]
}

function sseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function messageSignature(message: TranscriptMessage) {
  return JSON.stringify({
    index: message.index,
    role: message.role,
    content: message.content,
    reasoning: message.reasoning,
    toolCalls: message.toolCalls,
  })
}

export async function GET() {
  const encoder = new TextEncoder()
  let interval: NodeJS.Timeout | null = null
  let pingInterval: NodeJS.Timeout | null = null
  let closed = false
  let tickInFlight = false
  let emptySent = false
  const state: PollState = {
    sessionId: null,
    messageCount: 0,
    status: null,
    endedAt: null,
    messageSignatures: [],
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(sseEvent(event, payload)))
      }

      const tick = async () => {
        if (closed || tickInFlight) return
        tickInFlight = true

        try {
          const latestFile = await getLatestSessionFile()

          if (!latestFile) {
            if (state.sessionId !== null) {
              state.sessionId = null
              state.messageCount = 0
              state.status = null
              state.endedAt = null
              state.messageSignatures = []
              emptySent = false
            }

            if (!emptySent) {
              const empty = await getLatestSessionSnapshot()
              send("session", empty)
              emptySent = true
            }
            return
          }

          emptySent = false
          const snapshot = await readSessionSnapshot(latestFile.filePath, latestFile.mtimeMs)

          if (state.sessionId !== snapshot.sessionId) {
            state.sessionId = snapshot.sessionId
            state.messageCount = snapshot.messageCount
            state.status = snapshot.status
            state.endedAt = snapshot.endedAt
            state.messageSignatures = snapshot.messages.map(messageSignature)
            send("session", snapshot)
            return
          }

          if (snapshot.messageCount < state.messageCount) {
            state.messageCount = snapshot.messageCount
            state.messageSignatures = snapshot.messages.map(messageSignature)
            send("session", snapshot)
            return
          }

          const changedMessages: TranscriptMessage[] = []
          const nextSignatures = [...state.messageSignatures]

          for (const message of snapshot.messages) {
            const signature = messageSignature(message)
            if (nextSignatures[message.index] !== signature) {
              changedMessages.push(message)
              nextSignatures[message.index] = signature
            }
          }

          if (changedMessages.length > 0) {
            send("messages", {
              sessionId: snapshot.sessionId,
              messageCount: snapshot.messageCount,
              messages: changedMessages,
            })
          }

          state.messageCount = snapshot.messageCount
          state.messageSignatures = nextSignatures.slice(0, snapshot.messageCount)

          if (snapshot.status !== state.status || snapshot.endedAt !== state.endedAt) {
            state.status = snapshot.status
            state.endedAt = snapshot.endedAt
            send("status", {
              sessionId: snapshot.sessionId,
              status: snapshot.status,
              endedAt: snapshot.endedAt,
              error: snapshot.error,
            })
          }
        } catch {
          // Ignore transient parse/read failures (e.g. partial JSON write) and retry on next poll.
        } finally {
          tickInFlight = false
        }
      }

      send("connected", { ok: true })
      await tick()

      interval = setInterval(() => {
        void tick()
      }, 200)

      pingInterval = setInterval(() => {
        send("ping", { ts: Date.now() })
      }, 15000)
    },
    cancel() {
      closed = true
      if (interval) clearInterval(interval)
      if (pingInterval) clearInterval(pingInterval)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
