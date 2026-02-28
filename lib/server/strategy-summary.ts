import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import type {
  StrategyPresentation,
  StrategyPresentationMode,
  StrategySummaryCard,
  StrategySummaryCardKind,
  StrategySummaryResponse,
} from "@/lib/atlas-types"
import { readWorkspaceFile } from "./workspace-files"

interface Chunk {
  title: string
  lines: string[]
}

interface TranslationResult {
  cards: StrategySummaryCard[]
  presentation: StrategyPresentation
}

interface TranslationCacheEntry {
  expiresAt: number
  result: TranslationResult | null
}

const translationCache = new Map<string, TranslationCacheEntry>()

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function stripMarkdownFormatting(value: string) {
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
}

function stripHtmlComments(value: string) {
  return value.replace(/<!--[\s\S]*?-->/g, "")
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 3)).trim()}...`
}

function toTitleCaseLabel(value: string) {
  return compactWhitespace(value)
    .replace(/[|#*_`]+/g, "")
    .split(/\s+/)
    .slice(0, 4)
    .map((word) => word.toUpperCase())
    .join(" ")
}

function topLevelHeading(markdown: string) {
  const match = stripHtmlComments(markdown).match(/^#\s+(.+)\s*$/m)
  return match ? compactWhitespace(match[1]) : null
}

function firstNarrativeSentence(markdown: string) {
  const lines = stripHtmlComments(markdown)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#{1,6}\s+/.test(line))
    .filter((line) => !/^\|.*\|$/.test(line))
    .filter((line) => !/^\s*[-*]\s+/.test(line))

  return lines.length ? compactWhitespace(lines.join(" ")) : null
}

function splitIntoChunks(markdown: string): Chunk[] {
  const lines = stripHtmlComments(markdown).split(/\r?\n/)
  const chunks: Chunk[] = []
  let current: Chunk = { title: "Overview", lines: [] }

  for (const line of lines) {
    const headingMatch = line.match(/^#{2,3}\s+(.+)\s*$/)
    if (headingMatch) {
      if (current.lines.some((l) => l.trim())) {
        chunks.push(current)
      }
      current = { title: headingMatch[1].trim(), lines: [] }
      continue
    }
    current.lines.push(line)
  }

  if (current.lines.some((l) => l.trim())) {
    chunks.push(current)
  }

  return chunks
}

function detectKind(lines: string[]): StrategySummaryCard["kind"] {
  const hasTable = lines.some((line) => /^\|.*\|$/.test(line.trim()))
  const hasList = lines.some((line) => /^\s*[-*]\s+/.test(line))
  const textLines = lines.filter((line) => {
    const trimmed = line.trim()
    return trimmed && !trimmed.startsWith("|") && !trimmed.startsWith("-") && !trimmed.startsWith("*")
  })
  const hasText = textLines.length > 0

  const flags = [hasTable, hasList, hasText].filter(Boolean).length
  if (flags > 1) return "mixed"
  if (hasTable) return "table"
  if (hasList) return "list"
  return "text"
}

function tableSummary(lines: string[]) {
  const rows = lines.filter((line) => /^\|.*\|$/.test(line.trim()))
  const dataRows = rows.filter((line) => !/^\|\s*[-: ]+\|/.test(line.trim()))
  return stripMarkdownFormatting(compactWhitespace(dataRows.slice(0, 3).join(" ")))
}

function listSummary(lines: string[]) {
  const bullets = lines
    .filter((line) => /^\s*[-*]\s+/.test(line))
    .map((line) => stripMarkdownFormatting(compactWhitespace(line.replace(/^\s*[-*]\s+/, ""))))
    .filter(Boolean)

  return bullets.slice(0, 2).join(" • ")
}

function textSummary(lines: string[]) {
  const text = stripMarkdownFormatting(
    compactWhitespace(
      lines
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("|"))
        .join(" "),
    ),
  )

  if (text.length <= 180) return text
  return `${text.slice(0, 177).trim()}...`
}

function firstExcerpt(lines: string[]) {
  const excerpt = stripMarkdownFormatting(
    compactWhitespace(
      lines
        .map((line) => line.trim())
        .filter((line) => line && !/^\|\s*[-: ]+\|/.test(line))
        .slice(0, 6)
        .join("\n"),
    ),
  )

  if (excerpt.length <= 220) return excerpt
  return `${excerpt.slice(0, 217).trim()}...`
}

function scoreChunk(chunk: Chunk) {
  const joined = chunk.lines.join("\n")
  let score = 0
  if (chunk.title !== "Overview") score += 1
  if (/\|.*\|/.test(joined)) score += 4
  if (/^\s*[-*]\s+/m.test(joined)) score += 3
  if (compactWhitespace(joined).length > 80) score += 2
  if (/awaiting user input/i.test(joined)) score -= 100
  if (/not yet configured/i.test(joined)) score -= 100
  return score
}

function chunkToCard(chunk: Chunk, index: number): StrategySummaryCard {
  const kind = detectKind(chunk.lines)
  const summary =
    (kind === "table" && tableSummary(chunk.lines)) ||
    (kind === "list" && listSummary(chunk.lines)) ||
    textSummary(chunk.lines) ||
    "No structured content found in this section."

  return {
    id: String(index + 1),
    title: chunk.title,
    kind,
    summary,
    excerpt: firstExcerpt(chunk.lines),
  }
}

function fallbackCards(markdown: string, countNeeded: number, startIndex: number): StrategySummaryCard[] {
  const fallbackText = compactWhitespace(stripHtmlComments(markdown))

  if (!fallbackText) {
    return Array.from({ length: countNeeded }, (_, offset) => ({
      id: String(startIndex + offset + 1),
      title: offset === 0 ? "Status" : `Section ${startIndex + offset + 1}`,
      kind: "text",
      summary: offset === 0 ? "No strategy has been configured yet." : "Waiting for strategy content.",
      excerpt: "Add content to STRATEGY.md to populate this card.",
    }))
  }

  return Array.from({ length: countNeeded }, (_, offset) => ({
    id: String(startIndex + offset + 1),
    title: `Section ${startIndex + offset + 1}`,
    kind: "text",
    summary: fallbackText.slice(0, 180),
    excerpt: fallbackText.slice(0, 220),
  }))
}

function coerceKind(value: unknown): StrategySummaryCardKind | null {
  if (value === "table" || value === "list" || value === "text" || value === "mixed") return value
  return null
}

function asString(value: unknown) {
  return typeof value === "string" ? compactWhitespace(value) : ""
}

function normalizeCard(card: Partial<StrategySummaryCard> | null | undefined, fallback: StrategySummaryCard, index: number) {
  const title = truncate(asString(card?.title) || fallback.title, 48)
  const kind = coerceKind(card?.kind) ?? fallback.kind
  const summary = truncate(asString(card?.summary) || fallback.summary, 180)
  const excerpt = truncate(asString(card?.excerpt) || fallback.excerpt, 220)

  return {
    id: String(index + 1),
    title,
    kind,
    summary,
    excerpt,
  } satisfies StrategySummaryCard
}

function buildHeuristicPresentation(markdown: string, cards: StrategySummaryCard[], mode: StrategyPresentationMode): StrategyPresentation {
  const heading = topLevelHeading(markdown)
  const narrative = firstNarrativeSentence(markdown)
  const headline = heading ? `${heading}` : "Your strategy is ready."
  const subheadline =
    truncate(
      narrative ??
        "Atlas has built a personalized strategy for you. Review it below.",
      180,
    ) || "Review the translated strategy details below."

  const tiles = cards.slice(0, 4).map((card, index) => ({
    id: String(index + 1),
    label: truncate(toTitleCaseLabel(card.title) || `SECTION ${index + 1}`, 28),
    value: truncate(card.summary || "No summary available.", 120),
    detail: truncate(card.excerpt || card.summary || "", 140),
  }))

  while (tiles.length < 4) {
    const idx = tiles.length + 1
    tiles.push({
      id: String(idx),
      label: `SECTION ${idx}`,
      value: "Waiting for strategy content.",
      detail: "Add more detail to STRATEGY.md to populate this panel.",
    })
  }

  return {
    mode,
    headline,
    subheadline,
    panelTitle: heading ? `ATLAS'S STRATEGY` : "ATLAS'S STRATEGY",
    panelSubtitle: mode === "llm" ? "Personalized strategy overview" : "Strategy overview",
    footnote:
      mode === "llm"
        ? "Atlas will monitor markets 24/7 and notify you before any significant changes."
        : "Atlas will monitor markets and notify you before any significant changes.",
    tiles,
  }
}

function hashKeyForTranslation(markdown: string) {
  const provider = (process.env.LLM_PROVIDER ?? "claude-cli").trim().toLowerCase()
  const model = (process.env.LLM_MODEL ?? "sonnet").trim()
  const fallbackModel = (process.env.LLM_FALLBACK_MODEL ?? "haiku").trim()
  const base = (process.env.LLM_BASE_URL ?? "").trim()
  const claudePath = (process.env.LLM_CLAUDE_PATH ?? "claude").trim()
  const digest = createHash("sha256").update(markdown).digest("hex")
  return `${provider}:${model}:${fallbackModel}:${base}:${claudePath}:${digest}`
}

function isOpenAICompatibleProvider() {
  const provider = (process.env.LLM_PROVIDER ?? "claude-cli").trim().toLowerCase()
  return provider === "openai" || provider === "local"
}

function isClaudeCliProvider() {
  const provider = (process.env.LLM_PROVIDER ?? "claude-cli").trim().toLowerCase()
  return provider === "claude-cli"
}

function openAIChatCompletionsUrl() {
  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").trim().replace(/\/+$/, "")
  return baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`
}

function extractJsonString(content: string) {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/i)
  const source = fenced ? fenced[1] : content
  const start = source.indexOf("{")
  const end = source.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  return source.slice(start, end + 1)
}

function parseOpenAIContent(payload: unknown) {
  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices
  const content = choices?.[0]?.message?.content
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    const textParts = content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text
        }
        return ""
      })
      .filter(Boolean)
    return textParts.join("\n")
  }
  return null
}

function coerceLLMTiles(input: unknown, fallbackCards: StrategySummaryCard[]) {
  const rawTiles = Array.isArray(input) ? input : []
  const tiles = rawTiles
    .slice(0, 4)
    .map((tile, index) => {
      const tileObj = (tile ?? {}) as Record<string, unknown>
      return {
        id: String(index + 1),
        label: truncate(asString(tileObj.label) || toTitleCaseLabel(fallbackCards[index]?.title ?? ""), 28),
        value: truncate(asString(tileObj.value) || fallbackCards[index]?.summary || "No summary available.", 120),
        detail: truncate(asString(tileObj.detail) || fallbackCards[index]?.excerpt || "", 140),
      }
    })
    .filter((tile) => tile.label || tile.value)

  while (tiles.length < 4) {
    const fallback = fallbackCards[tiles.length]
    const idx = tiles.length + 1
    tiles.push({
      id: String(idx),
      label: truncate(toTitleCaseLabel(fallback?.title ?? `Section ${idx}`), 28),
      value: truncate(fallback?.summary ?? "Waiting for strategy content.", 120),
      detail: truncate(fallback?.excerpt ?? "", 140),
    })
  }

  return tiles
}

function coerceLLMResponseToTranslation(
  parsed: unknown,
  markdown: string,
  fallbackCards: StrategySummaryCard[],
): TranslationResult | null {
  if (!parsed || typeof parsed !== "object") return null
  const obj = parsed as Record<string, unknown>

  const translatedCards = Array.isArray(obj.cards)
    ? Array.from({ length: 4 }, (_, index) =>
        normalizeCard((obj.cards as Array<unknown>)[index] as Partial<StrategySummaryCard>, fallbackCards[index], index),
      )
    : fallbackCards.map((card, index) => normalizeCard(card, fallbackCards[index], index))

  const fallbackPresentation = buildHeuristicPresentation(markdown, translatedCards, "llm")
  const tiles = coerceLLMTiles(obj.tiles, translatedCards)

  const presentation: StrategyPresentation = {
    mode: "llm",
    headline: truncate(asString(obj.headline) || fallbackPresentation.headline, 90),
    subheadline: truncate(asString(obj.subheadline) || fallbackPresentation.subheadline, 200),
    panelTitle: truncate(asString(obj.panelTitle) || fallbackPresentation.panelTitle, 40),
    panelSubtitle: truncate(asString(obj.panelSubtitle) || fallbackPresentation.panelSubtitle, 80),
    footnote: truncate(asString(obj.footnote) || fallbackPresentation.footnote, 200),
    tiles,
  }

  return { cards: translatedCards, presentation }
}

function parseUnknownJson(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    const extracted = extractJsonString(input)
    if (!extracted) return null
    try {
      return JSON.parse(extracted)
    } catch {
      return null
    }
  }
}

function parseClaudeStructuredPayload(payload: unknown): Record<string, unknown> | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>
  }
  if (typeof payload !== "string") return null
  const parsed = parseUnknownJson(payload)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  return parsed as Record<string, unknown>
}

function claudeSummarySchema() {
  return JSON.stringify({
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      subheadline: { type: "string" },
      panelTitle: { type: "string" },
      panelSubtitle: { type: "string" },
      footnote: { type: "string" },
      tiles: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            detail: { type: "string" },
          },
          required: ["label", "value", "detail"],
        },
      },
      cards: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            kind: { enum: ["table", "list", "text", "mixed"] },
            summary: { type: "string" },
            excerpt: { type: "string" },
          },
          required: ["title", "kind", "summary", "excerpt"],
        },
      },
    },
    required: ["headline", "subheadline", "panelTitle", "panelSubtitle", "footnote", "tiles", "cards"],
  })
}

async function runClaudeJsonCommand(
  claudePath: string,
  args: string[],
  prompt: string,
  timeoutMs: number,
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const child = spawn(claudePath, args, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    })

    child.stdout.setEncoding("utf-8")
    child.stderr.setEncoding("utf-8")

    let stdout = ""
    let stderr = ""
    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeoutMs)

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })

    child.on("error", () => {
      clearTimeout(timeout)
      resolve(null)
    })

    child.on("close", (code) => {
      clearTimeout(timeout)
      if (timedOut || code !== 0) {
        void stderr
        resolve(null)
        return
      }
      resolve(stdout)
    })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

async function translateWithClaudeCli(markdown: string, fallbackCards: StrategySummaryCard[]): Promise<TranslationResult | null> {
  const claudePath = (process.env.LLM_CLAUDE_PATH ?? "claude").trim() || "claude"
  const model = (process.env.LLM_MODEL ?? "sonnet").trim()
  const fallbackModel = (process.env.LLM_FALLBACK_MODEL ?? "haiku").trim()
  const timeoutMs = Number.parseInt((process.env.LLM_TIMEOUT_MS ?? "180000").trim(), 10) || 180000
  const promptMarkdown = truncate(stripHtmlComments(markdown), 12000)

  const prompt = [
    "Convert STRATEGY.md markdown into UI-friendly summary JSON.",
    "Preserve facts and wording intent. Do not invent numbers or constraints.",
    "Return structured output that matches the JSON schema exactly.",
    "",
    "Markdown:",
    promptMarkdown,
  ].join("\\n")

  const args = [
    "-p",
    "--model",
    model,
    "--output-format",
    "json",
    "--json-schema",
    claudeSummarySchema(),
    "--tools",
    "",
    "--no-session-persistence",
  ]

  if (fallbackModel) {
    args.push("--fallback-model", fallbackModel)
  }

  const stdout = await runClaudeJsonCommand(claudePath, args, prompt, timeoutMs)
  if (!stdout) return null

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(stdout) as Record<string, unknown>
  } catch {
    return null
  }

  if (payload.is_error === true) {
    return null
  }

  const structured =
    parseClaudeStructuredPayload(payload.structured_output)
    ?? parseClaudeStructuredPayload(payload.result)
  if (!structured) return null

  return coerceLLMResponseToTranslation(structured, markdown, fallbackCards)
}

async function translateMarkdownToPresentation(markdown: string, fallbackCards: StrategySummaryCard[]): Promise<TranslationResult | null> {
  if (!markdown.trim()) return null

  const provider = (process.env.LLM_PROVIDER ?? "claude-cli").trim().toLowerCase()
  const cacheKey = hashKeyForTranslation(markdown)
  const cached = translationCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  if (isClaudeCliProvider()) {
    const translated = await translateWithClaudeCli(markdown, fallbackCards)
    translationCache.set(cacheKey, {
      result: translated,
      expiresAt: Date.now() + (translated ? 10 * 60_000 : 30_000),
    })
    return translated
  }

  if (!isOpenAICompatibleProvider()) return null

  const apiKey = (process.env.LLM_API_KEY ?? "").trim()
  if (!apiKey && provider !== "local") return null

  const model = (process.env.LLM_MODEL ?? "gpt-4o").trim()
  const promptMarkdown = truncate(stripHtmlComments(markdown), 12000)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 9000)

  try {
    const response = await fetch(openAIChatCompletionsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.75,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You convert STRATEGY.md markdown into UI-friendly summary JSON. Preserve facts and wording intent. Do not invent numbers or constraints. Prefer concise investor-facing phrasing.",
          },
          {
            role: "user",
            content: [
              "Return JSON with exactly these top-level keys:",
              "headline, subheadline, panelTitle, panelSubtitle, footnote, tiles, cards",
              "",
              "Rules:",
              "- tiles: exactly 4 items. Each item has label, value, detail.",
              "- cards: exactly 4 items. Each item has title, kind, summary, excerpt.",
              '- kind must be one of "table", "list", "text", "mixed".',
              "- Convert markdown tables/lists into readable prose for summaries.",
              "- Keep values compact enough for card UI.",
              "- Use only information present in the markdown.",
              "",
              "Markdown:",
              promptMarkdown,
            ].join("\n"),
          },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      translationCache.set(cacheKey, { result: null, expiresAt: Date.now() + 30_000 })
      return null
    }

    const payload = (await response.json()) as unknown
    const content = parseOpenAIContent(payload)
    if (!content) {
      translationCache.set(cacheKey, { result: null, expiresAt: Date.now() + 30_000 })
      return null
    }

    const jsonString = extractJsonString(content)
    if (!jsonString) {
      translationCache.set(cacheKey, { result: null, expiresAt: Date.now() + 30_000 })
      return null
    }

    const parsed = JSON.parse(jsonString) as unknown
    const translation = coerceLLMResponseToTranslation(parsed, markdown, fallbackCards)
    translationCache.set(cacheKey, {
      result: translation,
      expiresAt: Date.now() + (translation ? 10 * 60_000 : 30_000),
    })
    return translation
  } catch {
    translationCache.set(cacheKey, { result: null, expiresAt: Date.now() + 30_000 })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function buildHeuristicCards(markdown: string) {
  const chunks = splitIntoChunks(markdown)
    .filter((chunk) => compactWhitespace(chunk.lines.join("\n")).length > 0)
    .sort((a, b) => scoreChunk(b) - scoreChunk(a))

  const cards = chunks.slice(0, 4).map(chunkToCard)
  if (cards.length < 4) {
    cards.push(...fallbackCards(markdown, 4 - cards.length, cards.length))
  }
  return cards
}

function emptyStrategyResponse(): StrategySummaryResponse {
  const cards = fallbackCards("", 4, 0)
  return {
    file: "STRATEGY.md",
    mtimeMs: null,
    cards,
    presentation: buildHeuristicPresentation("", cards, "heuristic"),
    rawContent: "",
    exists: false,
  }
}

export async function buildStrategySummary(): Promise<StrategySummaryResponse> {
  const doc = await readWorkspaceFile("STRATEGY.md")
  if (!doc.exists) {
    return emptyStrategyResponse()
  }

  const heuristicCards = buildHeuristicCards(doc.content)
  const translated = await translateMarkdownToPresentation(doc.content, heuristicCards)
  const cards = translated?.cards ?? heuristicCards
  const presentation = translated?.presentation ?? buildHeuristicPresentation(doc.content, cards, "heuristic")

  return {
    file: "STRATEGY.md",
    mtimeMs: doc.mtimeMs,
    cards,
    presentation,
    rawContent: doc.content,
    exists: true,
  }
}
