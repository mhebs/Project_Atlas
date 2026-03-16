"use client"

import type { StrategySummaryResponse } from "@/lib/atlas-types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { parseStrategySections, type StrategySection } from "./parse-strategy-sections"

interface StrategyApprovalPanelProps {
  summary: StrategySummaryResponse
  onApprove: () => void
  onEdit: () => void
}

function parseMarkdownTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const tableLines = lines
    .map((l) => l.trim())
    .filter((l) => /^\|.*\|$/.test(l))
  if (tableLines.length < 2) return null

  const parse = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim())

  const headers = parse(tableLines[0])
  const rows = tableLines
    .slice(1)
    .filter((l) => !/^\|\s*[-: ]+\|/.test(l))
    .map(parse)

  return rows.length > 0 ? { headers, rows } : null
}

function SectionTable({ lines }: { lines: string[] }) {
  const table = parseMarkdownTable(lines)
  if (!table) return null

  return (
    <Table className="mt-2 border border-ob-border text-[13px]">
      <TableHeader>
        <TableRow className="border-ob-border hover:bg-transparent">
          {table.headers.map((h, i) => (
            <TableHead
              key={i}
              className="h-8 border-ob-border px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ob-gold/70"
            >
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.rows.map((row, ri) => (
          <TableRow key={ri} className="border-ob-border hover:bg-ob-accent/[0.03]">
            {row.map((cell, ci) => (
              <TableCell key={ci} className="px-3 py-2 text-ob-accent whitespace-normal">
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SectionList({ lines }: { lines: string[] }) {
  const items = lines
    .filter((l) => /^\s*([-*]|\d+\.)\s+/.test(l))
    .map((l) => l.replace(/^\s*([-*]|\d+\.)\s+/, "").trim())
    .filter(Boolean)

  if (items.length === 0) return null

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed text-ob-accent">
          <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 bg-ob-gold/50" />
          <span>{stripMarkdown(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function SectionText({ lines }: { lines: string[] }) {
  const text = lines
    .map((l) => l.trim())
    .filter((l) => l && !/^\|.*\|$/.test(l) && !/^\s*[-*]\s+/.test(l) && !/^\s*\d+\.\s+/.test(l))
    .join(" ")
    .trim()

  if (!text) return null

  return (
    <p className="mt-2 text-[14px] leading-relaxed text-ob-accent">
      {stripMarkdown(text)}
    </p>
  )
}

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
}

function SectionContent({ section }: { section: StrategySection }) {
  const { kind, lines } = section

  const nonEmpty = lines.filter((l) => l.trim())
  if (nonEmpty.length === 0) return null

  if (kind === "table") return <SectionTable lines={lines} />
  if (kind === "list") return <SectionList lines={lines} />
  if (kind === "text") return <SectionText lines={lines} />

  // mixed: show table, list, and remaining text
  return (
    <div>
      <SectionTable lines={lines} />
      <SectionList lines={lines} />
      <SectionText lines={lines} />
    </div>
  )
}

export function StrategyApprovalPanel({ summary, onApprove, onEdit }: StrategyApprovalPanelProps) {
  const sections = parseStrategySections(summary.rawContent)

  return (
    <div className="flex h-full w-full flex-col bg-ob-parchment">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-16 py-16">
        <div className="mx-auto w-full max-w-[560px]">
          {/* Eyebrow */}
          <p
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-ob-gold"
            style={{ animation: "fadeSlideUp 600ms ease-out 300ms both" }}
          >
            Strategy Review
          </p>

          {/* Heading */}
          <h2
            className="mt-3 font-serif text-[28px] leading-tight text-ob-accent"
            style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 450ms both" }}
          >
            Your investment blueprint
          </h2>

          {/* Subtitle */}
          <p
            className="mt-2 font-sans text-[14px] text-ob-muted"
            style={{ animation: "fadeSlideUp 600ms ease-out 550ms both" }}
          >
            Review each section below. When you&apos;re satisfied, approve to activate Atlas.
          </p>

          {/* Strategy sections */}
          <div
            className="mt-8 flex flex-col divide-y divide-ob-border"
            style={{ animation: "fadeSlideUp 600ms ease-out 650ms both" }}
          >
            {sections.map((section, i) => (
              <div key={i} className="py-5 first:pt-0 last:pb-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ob-gold/70">
                  {section.heading}
                </p>
                <SectionContent section={section} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="border-t border-ob-border bg-ob-parchment px-16 py-6"
        style={{ animation: "fadeSlideUp 600ms ease-out 900ms both" }}
      >
        <div className="mx-auto w-full max-w-[560px]">
          <button
            onClick={onApprove}
            className="h-[52px] w-full cursor-pointer bg-ob-accent-bright font-sans text-[15px] font-medium text-white transition-colors hover:bg-ob-accent"
          >
            Approve &amp; Activate &rarr;
          </button>
          <button
            onClick={onEdit}
            className="mt-3 w-full cursor-pointer bg-transparent py-2 font-mono text-[11px] text-ob-muted transition-colors hover:text-ob-accent"
          >
            &larr; Edit in chat
          </button>
        </div>
      </div>
    </div>
  )
}
