"use client"

type MarkdownLiteVariant = "default" | "atlas-gold"
type MarkdownLiteSurface = "panel" | "none"

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "hr" }
  | { type: "blockquote"; text: string }

function stripComments(markdown: string) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "")
}

function isTableLine(line: string) {
  const trimmed = line.trim()
  return trimmed.startsWith("|") && trimmed.endsWith("|")
}

function parseTableRow(line: string) {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim())
}

function isSeparatorRow(row: string[]) {
  return row.every((cell) => /^:?-{2,}:?$/.test(cell))
}

function InlineText({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  // Process inline markdown: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>)
    } else if (match[4]) {
      parts.push(
        <code key={match.index} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
          {match[4]}
        </code>
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

function normalizeEscapedNewlines(text: string): string {
  return text.replace(/\\n/g, "\n")
}

function parseMarkdownLite(markdown: string): MarkdownBlock[] {
  const lines = stripComments(normalizeEscapedNewlines(markdown)).split(/\r?\n/)
  const blocks: MarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" })
      i += 1
      continue
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""))
        i += 1
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") })
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      })
      i += 1
      continue
    }

    if (isTableLine(line)) {
      const tableLines: string[] = []
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i])
        i += 1
      }
      let rows = tableLines.map(parseTableRow)
      if (rows[1] && isSeparatorRow(rows[1])) {
        rows = [rows[0], ...rows.slice(2)]
      }
      if (rows.length > 0) {
        blocks.push({ type: "table", rows })
      }
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim())
        i += 1
      }
      blocks.push({ type: "list", items })
      continue
    }

    const paragraphLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !isTableLine(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("> ")
    ) {
      paragraphLines.push(lines[i].trim())
      i += 1
    }

    const paragraph = paragraphLines.join(" ").trim()
    if (paragraph) {
      blocks.push({ type: "paragraph", text: paragraph })
    }
  }

  return blocks
}

function headingClass(level: number) {
  if (level <= 1) return "text-xl font-serif text-foreground"
  if (level === 2) return "text-lg font-serif text-foreground"
  if (level === 3) return "text-sm font-medium text-foreground uppercase tracking-wide"
  return "text-sm font-medium text-foreground"
}

function themeClasses(variant: MarkdownLiteVariant) {
  if (variant === "atlas-gold") {
    return {
      panel: "rounded-2xl border border-[#c8a43a]/25 bg-[#FFFFFF] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]",
      empty: "text-sm text-[#8C8375]",
      paragraph: "text-sm leading-relaxed text-[#2C2617]",
      listItem: "flex items-start gap-2 text-sm text-[#2C2617]",
      listDot: "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37]",
      tableWrap: "overflow-x-auto rounded-xl border border-[#c8a43a]/20 bg-[#F5F0E8]/50",
      thead: "bg-[#d4af37]/8",
      th: "px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-[#9A7B2A]",
      tr: "border-t border-[#c8a43a]/15",
      td: "px-3 py-2 text-[#2C2617]",
      hr: "border-t border-[#c8a43a]/20",
      blockquote: "border-l-2 border-[#d4af37]/40 pl-4 text-sm leading-relaxed text-[#6B6259] italic",
      rawPanel: "rounded-2xl border border-[#c8a43a]/25 bg-[#FFFFFF] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]",
      rawTitle: "text-xs font-mono uppercase tracking-wider text-[#9A7B2A]",
      rawPre: "max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-[#2C2617]",
    } as const
  }

  return {
    panel: "rounded-lg border border-border bg-card p-4",
    empty: "text-sm text-muted-foreground",
    paragraph: "text-sm leading-relaxed text-foreground",
    listItem: "flex items-start gap-2 text-sm text-foreground",
    listDot: "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary",
    tableWrap: "overflow-x-auto rounded-md border border-border",
    thead: "bg-muted/50",
    th: "px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-muted-foreground",
    tr: "border-t border-border",
    td: "px-3 py-2 text-foreground",
    hr: "border-t border-border",
    blockquote: "border-l-2 border-primary/30 pl-4 text-sm leading-relaxed text-muted-foreground italic",
    rawPanel: "rounded-lg border border-border bg-card p-4",
    rawTitle: "text-xs font-mono uppercase tracking-wider text-muted-foreground",
    rawPre:
      "max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground",
  } as const
}

export function MarkdownLite({
  markdown,
  variant = "default",
  surface = "panel",
  className,
}: {
  markdown: string
  variant?: MarkdownLiteVariant
  surface?: MarkdownLiteSurface
  className?: string
}) {
  const blocks = parseMarkdownLite(markdown)
  const theme = themeClasses(variant)

  if (!blocks.length) {
    if (surface === "none") return null
    return (
      <div className={className ? `${theme.panel} ${className}` : theme.panel}>
        <p className={theme.empty}>No content to preview.</p>
      </div>
    )
  }

  const content = (
    <div className={surface === "none" ? className : className ? `${theme.panel} ${className}` : theme.panel}>
      <div className="space-y-4">
        {blocks.map((block, index) => {
          if (block.type === "heading") {
            const themedHeading =
              variant === "atlas-gold"
                ? headingClass(block.level)
                    .replace("text-foreground", "text-[#1A1507]")
                    .replace("tracking-wide", "tracking-[0.14em]")
                : headingClass(block.level)
            return (
              <div key={`h-${index}`} className={themedHeading}>
                {block.text}
              </div>
            )
          }

          if (block.type === "hr") {
            return <hr key={`hr-${index}`} className={theme.hr} />
          }

          if (block.type === "blockquote") {
            return (
              <blockquote key={`bq-${index}`} className={theme.blockquote}>
                <InlineText text={block.text} />
              </blockquote>
            )
          }

          if (block.type === "paragraph") {
            return (
              <p key={`p-${index}`} className={theme.paragraph}>
                <InlineText text={block.text} />
              </p>
            )
          }

          if (block.type === "list") {
            return (
              <ul key={`l-${index}`} className="space-y-2">
                {block.items.map((item, itemIndex) => {
                  const checkMatch = item.match(/^\[(x| )\]\s+(.*)$/)
                  if (checkMatch) {
                    const checked = checkMatch[1] === "x"
                    const label = checkMatch[2]
                    return (
                      <li key={itemIndex} className={theme.listItem}>
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                          {checked && "✓"}
                        </span>
                        <span className="leading-relaxed"><InlineText text={label} /></span>
                      </li>
                    )
                  }
                  return (
                    <li key={itemIndex} className={theme.listItem}>
                      <span className={theme.listDot} />
                      <span className="leading-relaxed"><InlineText text={item} /></span>
                    </li>
                  )
                })}
              </ul>
            )
          }

          const [headerRow, ...bodyRows] = block.rows
          return (
            <div key={`t-${index}`} className={theme.tableWrap}>
              <table className="min-w-full text-sm">
                <thead className={theme.thead}>
                  <tr>
                    {headerRow.map((cell, cellIndex) => (
                      <th key={cellIndex} className={theme.th}>
                        <InlineText text={cell} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={theme.tr}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className={theme.td}>
                          <InlineText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )

  return content
}

export function RawMarkdownPanel({
  markdown,
  variant = "default",
}: {
  markdown: string
  variant?: MarkdownLiteVariant
}) {
  const theme = themeClasses(variant)
  return (
    <div className={theme.rawPanel}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={theme.rawTitle}>Raw Markdown</h3>
      </div>
      <pre className={theme.rawPre}>
        {markdown || "(empty)"}
      </pre>
    </div>
  )
}
