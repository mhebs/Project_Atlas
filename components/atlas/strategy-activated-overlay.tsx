"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { StrategySummaryResponse } from "@/lib/atlas-types"
import { Starfield, type Star } from "./starfield"

const STARS: Star[] = [
  { top: "6%", left: "15%", size: 2, opacity: 0.4, type: "dot" },
  { top: "12%", left: "38%", size: 3, opacity: 0.5, type: "dot" },
  { top: "18%", left: "75%", size: 2, opacity: 0.35, type: "dot" },
  { top: "32%", left: "92%", size: 2, opacity: 0.3, type: "dot" },
  { top: "58%", left: "6%", size: 3, opacity: 0.45, type: "dot" },
  { top: "72%", left: "48%", size: 2, opacity: 0.3, type: "dot" },
  { top: "85%", left: "82%", size: 2, opacity: 0.35, type: "dot" },
  { top: "42%", left: "12%", size: 2, opacity: 0.3, type: "dot" },
  { top: "88%", left: "22%", size: 3, opacity: 0.4, type: "dot" },
  { top: "10%", left: "22%", size: 6, opacity: 0.5, type: "diamond" },
  { top: "25%", left: "85%", size: 5, opacity: 0.4, type: "diamond" },
  { top: "70%", left: "8%", size: 5, opacity: 0.35, type: "diamond" },
  { top: "80%", left: "88%", size: 6, opacity: 0.4, type: "diamond" },
]

/** Strip markdown formatting and cap at first sentence, max 120 chars */
function cleanSubheadline(raw: string): string {
  let text = raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim()

  const sentenceEnd = text.search(/\. |\.\n/)
  if (sentenceEnd !== -1) {
    text = text.slice(0, sentenceEnd + 1)
  }

  if (text.length > 120) {
    text = text.slice(0, 117) + "..."
  }

  return text
}

export function StrategyActivatedOverlay({ onComplete }: { onComplete: () => void }) {
  const [summary, setSummary] = useState<StrategySummaryResponse | null>(null)
  const [exiting, setExiting] = useState(false)
  const mountedRef = useRef(true)

  const handleComplete = () => {
    setExiting(true)
    setTimeout(onComplete, 300)
  }

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/strategy-summary", { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as StrategySummaryResponse
      if (!mountedRef.current) return
      setSummary(data)
    } catch {
      // Strategy summary might not have LLM translation yet — show defaults
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadSummary()
    return () => {
      mountedRef.current = false
    }
  }, [loadSummary])

  const headline = summary?.presentation.headline ?? "Your Strategy Is Set"
  const subheadline = summary
    ? cleanSubheadline(summary.presentation.subheadline)
    : "Meridian is ready to manage your portfolio based on this strategy."

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[#060606]"
      style={exiting ? { animation: "fadeOut 300ms ease-in forwards" } : { animation: "fadeIn 600ms ease-out" }}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[700px] w-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 35%, transparent 65%)",
          }}
        />
      </div>

      {/* Starfield */}
      <Starfield stars={STARS} />

      <div className="relative z-10 flex flex-col items-center px-6 py-12">
        {/* Compass icon */}
        <div
          className="relative"
          style={{ animation: "fadeSlideUp 600ms ease-out 200ms both" }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
              transform: "scale(1.5)",
            }}
          />
          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" className="relative">
            <circle cx="60" cy="60" r="57" stroke="#d4af37" strokeWidth="0.6" opacity="0.25" />
            <circle cx="60" cy="60" r="47" stroke="#d4af37" strokeWidth="0.8" opacity="0.4" />
            <circle cx="60" cy="60" r="25" stroke="#d4af37" strokeWidth="1.3" fill="rgba(212,175,55,0.05)" opacity="0.7" />
            <circle cx="60" cy="60" r="14" stroke="#d4af37" strokeWidth="0.9" fill="none" opacity="0.55" />
            <line x1="50" y1="70" x2="70" y2="50" stroke="#d4af37" strokeWidth="1.1" opacity="0.6" />
            <circle cx="60" cy="60" r="1.5" fill="#d4af37" opacity="0.45" />
          </svg>
        </div>

        {/* STRATEGY ACTIVATED label */}
        <p
          className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-[#d4af37]/70"
          style={{ animation: "fadeSlideUp 600ms ease-out 400ms both" }}
        >
          Strategy Activated
        </p>

        {/* Headline */}
        <h1
          className="mt-4 max-w-[520px] text-center font-serif text-3xl leading-tight text-[#f8efdc] sm:text-[38px]"
          style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 600ms both" }}
        >
          {headline}
        </h1>

        {/* Subheadline */}
        <p
          className="mt-3 max-w-[400px] text-center text-[15px] leading-relaxed text-[#d9d1c3]/50"
          style={{ animation: "fadeSlideUp 600ms ease-out 700ms both" }}
        >
          {subheadline}
        </p>

        {/* 4-tile strategy card */}
        {summary && (
          <div
            className="mt-8 w-full max-w-[520px]"
            style={{ animation: "fadeSlideUp 600ms ease-out 800ms both" }}
          >
            <section className="overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-[#0f0d0a] shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-[#d4af37]/10 px-6 py-3.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]/60">
                  {summary.presentation.panelTitle}
                </p>
              </div>

              {/* 2x2 tile grid */}
              <div className="grid grid-cols-2">
                {summary.presentation.tiles.map((tile, index) => (
                  <div
                    key={tile.id}
                    className={[
                      "px-5 py-5",
                      index % 2 === 1 ? "border-l border-[#d4af37]/10" : "",
                      index >= 2 ? "border-t border-[#d4af37]/10" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#d4af37]/50">
                      {tile.label}
                    </p>
                    <p className="mt-2.5 text-[15px] leading-snug text-[#f8efdc]/90">
                      {tile.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Footnote strip */}
              {summary.presentation.footnote && (
                <div className="border-t border-[#d4af37]/10 px-6 py-3">
                  <p className="flex items-center gap-2 text-[12px] italic text-[#d9d1c3]/35">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
                      <path d="M9.5 1L4 9h4l-1.5 6L13 7H9l.5-6Z" fill="#d4af37" opacity="0.45" />
                    </svg>
                    {summary.presentation.footnote}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Activate CTA */}
        <button
          autoFocus
          onClick={handleComplete}
          className="mt-10 cursor-pointer rounded-2xl bg-[#d4af37] px-12 py-4 text-[17px] font-semibold text-[#1a1507] shadow-[0_8px_30px_rgba(212,175,55,0.25)] transition-all hover:bg-[#e0bf4a] hover:shadow-[0_8px_40px_rgba(212,175,55,0.35)] active:scale-[0.99]"
          style={{ animation: "fadeSlideUp 600ms ease-out 1000ms both" }}
        >
          Activate Atlas &rarr;
        </button>
      </div>
    </div>
  )
}
