export interface StrategySection {
  heading: string
  content: string
  kind: "table" | "list" | "text" | "mixed"
  lines: string[]
}

function stripHtmlComments(value: string) {
  return value.replace(/<!--[\s\S]*?-->/g, "")
}

function detectKind(lines: string[]): StrategySection["kind"] {
  const hasTable = lines.some((line) => /^\|.*\|$/.test(line.trim()))
  const hasList = lines.some((line) => /^\s*([-*]|\d+\.)\s+/.test(line))
  const textLines = lines.filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed &&
      !trimmed.startsWith("|") &&
      !/^\d+\./.test(trimmed) &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("*")
    )
  })
  const hasText = textLines.length > 0

  const flags = [hasTable, hasList, hasText].filter(Boolean).length
  if (flags > 1) return "mixed"
  if (hasTable) return "table"
  if (hasList) return "list"
  return "text"
}

/** Lines that are just frontmatter metadata (bold key: value, ---, Status: X) */
function isMetadataLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (/^---+$/.test(trimmed)) return true
  if (/^\*\*[^*]+\*\*\s*:/.test(trimmed)) return true
  return false
}

export function parseStrategySections(rawContent: string): StrategySection[] {
  const cleaned = stripHtmlComments(rawContent)
  const allLines = cleaned.split(/\r?\n/)
  const sections: StrategySection[] = []
  let current: { heading: string; lines: string[] } = { heading: "Overview", lines: [] }
  let isH1Section = false

  for (const line of allLines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)\s*$/)
    if (headingMatch) {
      if (current.lines.some((l) => l.trim())) {
        // Skip the H1 title section if it's just metadata (e.g. "Strategy Type: ..." + "---")
        const skipMetadata = isH1Section && current.lines.every(isMetadataLine)
        if (!skipMetadata) {
          sections.push({
            heading: current.heading,
            content: current.lines.join("\n").trim(),
            kind: detectKind(current.lines),
            lines: current.lines,
          })
        }
      }
      isH1Section = /^#\s+/.test(line) && !/^##/.test(line)
      current = { heading: headingMatch[1].trim(), lines: [] }
      continue
    }
    current.lines.push(line)
  }

  if (current.lines.some((l) => l.trim())) {
    sections.push({
      heading: current.heading,
      content: current.lines.join("\n").trim(),
      kind: detectKind(current.lines),
      lines: current.lines,
    })
  }

  return sections
}
