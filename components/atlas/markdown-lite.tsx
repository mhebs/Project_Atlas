"use client"

type MarkdownLiteVariant = "default" | "atlas-gold"

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; rows: string[][] }

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

function parseMarkdownLite(markdown: string): MarkdownBlock[] {
  const lines = stripComments(markdown).split(/\r?\n/)
  const blocks: MarkdownBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
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
      !isTableLine(lines[i])
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
      panel: "rounded-2xl border border-[#c8a43a]/20 bg-[#11100d]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
      empty: "text-sm text-[#d9d1c3]/60",
      paragraph: "text-sm leading-relaxed text-[#f3ead8]",
      listItem: "flex items-start gap-2 text-sm text-[#f3ead8]",
      listDot: "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37]",
      tableWrap: "overflow-x-auto rounded-xl border border-[#c8a43a]/20 bg-black/20",
      thead: "bg-[#d4af37]/8",
      th: "px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-[#d9b248]",
      tr: "border-t border-[#c8a43a]/15",
      td: "px-3 py-2 text-[#f3ead8]",
      rawPanel: "rounded-2xl border border-[#c8a43a]/20 bg-[#11100d]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]",
      rawTitle: "text-xs font-mono uppercase tracking-wider text-[#d9b248]/80",
      rawPre: "max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-[#efe6d6]",
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
    rawPanel: "rounded-lg border border-border bg-card p-4",
    rawTitle: "text-xs font-mono uppercase tracking-wider text-muted-foreground",
    rawPre:
      "max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground",
  } as const
}

export function MarkdownLite({
  markdown,
  variant = "default",
}: {
  markdown: string
  variant?: MarkdownLiteVariant
}) {
  const blocks = parseMarkdownLite(markdown)
  const theme = themeClasses(variant)

  if (!blocks.length) {
    return (
      <div className={theme.panel}>
        <p className={theme.empty}>No content to preview.</p>
      </div>
    )
  }

  return (
    <div className={theme.panel}>
      <div className="space-y-4">
        {blocks.map((block, index) => {
          if (block.type === "heading") {
            const themedHeading =
              variant === "atlas-gold"
                ? headingClass(block.level)
                    .replace("text-foreground", "text-[#f8eed9]")
                    .replace("tracking-wide", "tracking-[0.14em]")
                : headingClass(block.level)
            return (
              <div key={`h-${index}`} className={themedHeading}>
                {block.text}
              </div>
            )
          }

          if (block.type === "paragraph") {
            return (
              <p key={`p-${index}`} className={theme.paragraph}>
                {block.text}
              </p>
            )
          }

          if (block.type === "list") {
            return (
              <ul key={`l-${index}`} className="space-y-2">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className={theme.listItem}>
                    <span className={theme.listDot} />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
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
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={theme.tr}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className={theme.td}>
                          {cell}
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
