import type { UIMessageStreamWriter } from "ai"
import type { ChatStreamEvent } from "@/lib/atlas-types"

/**
 * Reads agent NDJSON events from a ReadableStream and writes corresponding
 * UIMessageStream chunks via the provided writer.
 *
 * Event mapping:
 *   turn/started           → start-step
 *   item/agentMessage/delta → text-delta (auto-opens text-start)
 *   item/reasoning/delta    → reasoning-delta (auto-opens reasoning-start)
 *   item/started|updated (assistant w/ toolCalls) → tool-input-available per call
 *   item/completed (role=tool) → tool-output-available
 *   turn/completed (awaiting_input) → data-pending-question
 *   turn/completed          → finish-step + finish
 *   error                   → error
 */
export async function pipeNdjsonToUIStream(
  ndjsonStream: ReadableStream<Uint8Array>,
  writer: UIMessageStreamWriter,
) {
  const reader = ndjsonStream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  // Track which parts we've opened so we can close them properly
  let textPartOpen = false
  let reasoningPartOpen = false
  let stepOpen = false
  const textPartId = `text-${Date.now()}`
  const reasoningPartId = `reasoning-${Date.now()}`
  const emittedToolCalls = new Set<string>()

  function openStep() {
    if (!stepOpen) {
      writer.write({ type: "start-step" })
      stepOpen = true
    }
  }

  function closeText() {
    if (textPartOpen) {
      writer.write({ type: "text-end", id: textPartId })
      textPartOpen = false
    }
  }

  function closeReasoning() {
    if (reasoningPartOpen) {
      writer.write({ type: "reasoning-end", id: reasoningPartId })
      reasoningPartOpen = false
    }
  }

  function closeStep() {
    if (stepOpen) {
      closeText()
      closeReasoning()
      writer.write({ type: "finish-step" })
      stepOpen = false
    }
  }

  function processEvent(event: ChatStreamEvent) {
    switch (event.type) {
      case "turn/started": {
        openStep()
        break
      }

      case "item/agentMessage/delta": {
        openStep()
        if (!textPartOpen) {
          writer.write({ type: "text-start", id: textPartId })
          textPartOpen = true
        }
        writer.write({ type: "text-delta", id: textPartId, delta: event.delta })
        break
      }

      case "item/reasoning/delta": {
        openStep()
        if (!reasoningPartOpen) {
          writer.write({ type: "reasoning-start", id: reasoningPartId })
          reasoningPartOpen = true
        }
        writer.write({ type: "reasoning-delta", id: reasoningPartId, delta: event.delta })
        break
      }

      case "item/started":
      case "item/updated": {
        const item = event.item
        if (item.role === "assistant" && item.toolCalls.length > 0) {
          openStep()
          // Close any open text/reasoning before tool calls
          closeText()
          closeReasoning()

          for (const tc of item.toolCalls) {
            if (emittedToolCalls.has(tc.id)) continue
            emittedToolCalls.add(tc.id)

            let parsedArgs: unknown = tc.arguments
            try {
              parsedArgs = JSON.parse(tc.arguments)
            } catch {
              // keep as string
            }

            writer.write({
              type: "tool-input-available",
              toolCallId: tc.id,
              toolName: tc.name,
              input: parsedArgs,
            })
          }
        }
        break
      }

      case "item/completed": {
        const item = event.item

        // Emit tool results for tool messages
        if (item.role === "tool" && item.toolCallId) {
          writer.write({
            type: "tool-output-available",
            toolCallId: item.toolCallId,
            output: item.content,
          })
        }

        // When an assistant item completes with tool calls, also emit any
        // tool calls we haven't seen yet
        if (item.role === "assistant" && item.toolCalls.length > 0) {
          for (const tc of item.toolCalls) {
            if (emittedToolCalls.has(tc.id)) continue
            emittedToolCalls.add(tc.id)

            let parsedArgs: unknown = tc.arguments
            try {
              parsedArgs = JSON.parse(tc.arguments)
            } catch {
              // keep as string
            }

            writer.write({
              type: "tool-input-available",
              toolCallId: tc.id,
              toolName: tc.name,
              input: parsedArgs,
            })
          }
        }
        break
      }

      case "turn/updated": {
        // No-op for the stream — state is handled via turn/completed
        break
      }

      case "turn/completed": {
        // Emit pending question as custom data part if awaiting input
        if (event.status === "awaiting_input" && event.pendingQuestion) {
          writer.write({
            type: "data-pending-question" as `data-${string}`,
            data: event.pendingQuestion,
          } as Parameters<typeof writer.write>[0])
        }

        closeStep()
        writer.write({
          type: "finish",
          finishReason: event.status === "awaiting_input" ? "stop" : "stop",
        })
        break
      }

      case "error": {
        writer.write({ type: "error", errorText: event.message })
        break
      }

      case "end": {
        // The agent stream has ended. If we haven't closed yet, do so.
        if (stepOpen) {
          closeStep()
          writer.write({ type: "finish", finishReason: "stop" })
        }
        break
      }
    }
  }

  try {
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

        try {
          const event = JSON.parse(line) as ChatStreamEvent
          processEvent(event)
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Handle any remaining buffer
    const remainder = buffer.trim()
    if (remainder) {
      try {
        processEvent(JSON.parse(remainder) as ChatStreamEvent)
      } catch {
        // Skip malformed
      }
    }

    // Ensure we close everything
    if (stepOpen) {
      closeStep()
      writer.write({ type: "finish", finishReason: "stop" })
    }
  } finally {
    reader.releaseLock()
  }
}
