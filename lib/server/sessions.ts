import fs from "node:fs/promises"
import path from "node:path"
import type {
  EmptySessionTranscript,
  LatestSessionResponse,
  SessionTranscript,
  TranscriptMessage,
  TranscriptToolCall,
} from "@/lib/atlas-types"
import { getSessionsDir } from "./config"

interface RawToolCall {
  id?: string
  type?: string
  function?: {
    name?: string
    arguments?: string
  }
}

interface RawLLMMessage {
  role?: "system" | "user" | "assistant" | "tool"
  content?: string | null
  tool_calls?: RawToolCall[]
  tool_call_id?: string
  name?: string
}

interface RawTimestampedMessage {
  timestamp?: string
  message?: RawLLMMessage
}

interface RawSessionFile {
  id?: string
  status?: "running" | "completed" | "error"
  startedAt?: string
  endedAt?: string
  error?: string
  messages?: RawTimestampedMessage[]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readJsonWithRetries<T>(filePath: string, attempts = 3): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const content = await fs.readFile(filePath, "utf-8")
      return JSON.parse(content) as T
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) {
        await sleep(50 * (attempt + 1))
      }
    }
  }

  throw lastError
}

export async function listSessionFiles() {
  const sessionsDir = getSessionsDir()

  try {
    const entries = await fs.readdir(sessionsDir)
    const files = await Promise.all(
      entries
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => {
          const filePath = path.join(sessionsDir, name)
          const stat = await fs.stat(filePath)
          return {
            name,
            filePath,
            mtimeMs: stat.mtimeMs,
          }
        }),
    )

    return files.sort((a, b) => b.mtimeMs - a.mtimeMs)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
}

export async function getLatestSessionFile() {
  const files = await listSessionFiles()
  return files[0] || null
}

function normalizeToolCalls(raw: RawToolCall[] | undefined): TranscriptToolCall[] {
  return (raw || []).map((toolCall) => ({
    id: toolCall.id || "",
    name: toolCall.function?.name || "unknown_tool",
    arguments: toolCall.function?.arguments || "",
  }))
}

function normalizeMessages(rawMessages: RawTimestampedMessage[] | undefined): TranscriptMessage[] {
  return (rawMessages || []).map((entry, index) => ({
    index,
    timestamp: entry.timestamp || new Date(0).toISOString(),
    role: entry.message?.role || "assistant",
    content: entry.message?.content || "",
    toolCalls: normalizeToolCalls(entry.message?.tool_calls),
    toolCallId: entry.message?.tool_call_id || null,
    name: entry.message?.name || null,
  }))
}

function emptySession(): EmptySessionTranscript {
  return {
    sessionId: null,
    status: null,
    startedAt: null,
    endedAt: null,
    error: null,
    mtimeMs: null,
    messageCount: 0,
    messages: [],
  }
}

export async function readSessionSnapshot(filePath: string, mtimeMs?: number): Promise<SessionTranscript> {
  const raw = await readJsonWithRetries<RawSessionFile>(filePath)
  const messages = normalizeMessages(raw.messages)
  const stat = typeof mtimeMs === "number" ? null : await fs.stat(filePath)

  return {
    sessionId: raw.id || path.basename(filePath, ".json"),
    status: raw.status || "running",
    startedAt: raw.startedAt || "",
    endedAt: raw.endedAt || null,
    error: raw.error || null,
    mtimeMs: typeof mtimeMs === "number" ? mtimeMs : stat!.mtimeMs,
    messageCount: messages.length,
    messages,
  }
}

export async function getLatestSessionSnapshot(): Promise<LatestSessionResponse> {
  const latest = await getLatestSessionFile()
  if (!latest) return emptySession()

  return readSessionSnapshot(latest.filePath, latest.mtimeMs)
}

