import { spawn } from "child_process"
import path from "path"
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai"
import { getRepoRoot } from "@/lib/server/config"
import { loadRepoEnv } from "@/lib/server/env-loader"
import { getLatestSessionFile, readSessionSnapshot } from "@/lib/server/sessions"
import { pipeNdjsonToUIStream } from "@/lib/adapters/ndjson-to-ui-stream"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

const MAX_MESSAGE_LENGTH = 2000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages = body.messages as UIMessage[] | undefined

    // Extract the latest user message text
    let messageText = ""
    if (messages && messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
      if (lastUserMessage) {
        const textPart = lastUserMessage.parts.find(
          (p): p is { type: "text"; text: string } => p.type === "text",
        )
        messageText = textPart?.text?.trim() ?? ""
      }
    }

    if (!messageText) {
      return Response.json({ error: "Message is required" }, { status: 400 })
    }

    if (messageText.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
        { status: 400 },
      )
    }

    const repoRoot = getRepoRoot()
    const agentScript = path.join(repoRoot, "packages", "agent", "dist", "index.js")
    const envVars = {
      ...process.env,
      ...loadRepoEnv(repoRoot),
      LOG_LEVEL: "silent",
    }

    const agentArgs = [agentScript, "--once", "--stream-json", `--trigger=${messageText}`]

    try {
      const latestFile = await getLatestSessionFile()
      if (latestFile) {
        const snapshot = await readSessionSnapshot(latestFile.filePath, latestFile.mtimeMs)

        if (snapshot.status === "awaiting_input") {
          return Response.json(
            { error: "Agent is waiting for your answer. Please respond to the question first." },
            { status: 409 },
          )
        }

        if (snapshot.status === "running") {
          return Response.json(
            { error: "Agent is already running. Please wait for the current response to finish." },
            { status: 409 },
          )
        }

        if (snapshot.sessionId && snapshot.status === "completed") {
          agentArgs.push(`--continue-session=${snapshot.sessionId}`)
        }
      }
    } catch {
      // Ignore snapshot read failures and start fresh.
    }

    const child = spawn(process.execPath, agentArgs, {
      cwd: repoRoot,
      env: envVars,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let requestClosed = false

    request.signal.addEventListener("abort", () => {
      requestClosed = true
      child.kill("SIGTERM")
    })

    // Collect stderr for error reporting
    let stderrOutput = ""
    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      stderrOutput = `${stderrOutput}${chunk}`.slice(-4000)
    })

    // Create a ReadableStream from the child's stdout
    const ndjsonStream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (!child.stdout) {
          controller.close()
          return
        }

        child.stdout.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        child.on("error", (error) => {
          if (!requestClosed) {
            const encoder = new TextEncoder()
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "error", message: error.message }) + "\n",
              ),
            )
            controller.enqueue(encoder.encode(JSON.stringify({ type: "end" }) + "\n"))
          }
          controller.close()
        })

        child.on("close", (code) => {
          if (!requestClosed && code && code !== 0 && stderrOutput.trim()) {
            const encoder = new TextEncoder()
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "error", message: stderrOutput.trim() }) + "\n",
              ),
            )
            controller.enqueue(encoder.encode(JSON.stringify({ type: "end" }) + "\n"))
          }
          controller.close()
        })
      },
      cancel() {
        requestClosed = true
        child.kill("SIGTERM")
      },
    })

    return createUIMessageStreamResponse({
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
      stream: createUIMessageStream({
        async execute({ writer }) {
          await pipeNdjsonToUIStream(ndjsonStream, writer)
        },
        onError: (error) =>
          error instanceof Error ? error.message : "Stream error",
      }),
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start streamed turn" },
      { status: 500 },
    )
  }
}
