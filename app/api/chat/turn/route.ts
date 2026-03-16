import { spawn } from "child_process"
import path from "path"
import { getRepoRoot } from "@/lib/server/config"
import { loadRepoEnv } from "@/lib/server/env-loader"
import { getLatestSessionFile, readSessionSnapshot } from "@/lib/server/sessions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_MESSAGE_LENGTH = 2000

function streamEvent(type: string, payload: Record<string, unknown>) {
  return `${JSON.stringify({ type, ...payload })}\n`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400 })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
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

    const agentArgs = [agentScript, "--once", "--stream-json", `--trigger=${message}`]

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

    const encoder = new TextEncoder()
    let requestClosed = false

    request.signal.addEventListener("abort", () => {
      requestClosed = true
      child.kill("SIGTERM")
    })

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (!child.stdout) {
          controller.enqueue(
            encoder.encode(streamEvent("error", { message: "Agent stdout stream is unavailable" })),
          )
          controller.enqueue(encoder.encode(streamEvent("end", {})))
          controller.close()
          return
        }

        let buffer = ""
        let sawEnd = false
        let stderrOutput = ""

        const enqueueLine = (line: string) => {
          if (!line.trim()) return
          try {
            const parsed = JSON.parse(line) as { type?: string }
            if (parsed.type === "end") {
              sawEnd = true
            }
            controller.enqueue(encoder.encode(`${JSON.stringify(parsed)}\n`))
          } catch {
            controller.enqueue(
              encoder.encode(streamEvent("error", { message: "Malformed agent stream event" })),
            )
          }
        }

        child.stdout.setEncoding("utf8")
        child.stdout.on("data", (chunk: string) => {
          buffer += chunk

          while (true) {
            const newlineIndex = buffer.indexOf("\n")
            if (newlineIndex === -1) break
            const line = buffer.slice(0, newlineIndex)
            buffer = buffer.slice(newlineIndex + 1)
            enqueueLine(line)
          }
        })

        child.stderr?.setEncoding("utf8")
        child.stderr?.on("data", (chunk: string) => {
          stderrOutput = `${stderrOutput}${chunk}`.slice(-4000)
        })

        child.on("error", (error) => {
          if (requestClosed) return
          controller.enqueue(encoder.encode(streamEvent("error", { message: error.message })))
          controller.enqueue(encoder.encode(streamEvent("end", {})))
          controller.close()
        })

        child.on("close", (code) => {
          if (requestClosed) {
            controller.close()
            return
          }

          if (buffer.trim()) {
            enqueueLine(buffer)
            buffer = ""
          }

          if (!sawEnd) {
            const message =
              code && code !== 0
                ? stderrOutput.trim() || `Agent exited with code ${code}`
                : null

            if (message) {
              controller.enqueue(encoder.encode(streamEvent("error", { message })))
            }

            controller.enqueue(encoder.encode(streamEvent("end", {})))
          }

          controller.close()
        })
      },
      cancel() {
        requestClosed = true
        child.kill("SIGTERM")
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start streamed turn" },
      { status: 500 },
    )
  }
}
