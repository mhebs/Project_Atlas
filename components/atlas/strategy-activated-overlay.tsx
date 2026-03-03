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
  // Strip markdown: **bold**, *italic*, __bold__, _italic_, `code`
  let text = raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim()

  // Cap at first sentence
  const sentenceEnd = text.search(/\. |\.\n/)
  if (sentenceEnd !== -1) {
    text = text.slice(0, sentenceEnd + 1)
  }

  // Hard truncate at 120 chars if still too long
  if (text.length > 120) {
    text = text.slice(0, 117) + "..."
  }

  return text
}

export function StrategyActivatedOverlay({ onComplete }: { onComplete: () => void }) {
  const [headline, setHeadline] = useState<string | null>(null)
  const [subheadline, setSubheadline] = useState<string | null>(null)
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
      setHeadline(data.presentation.headline)
      setSubheadline(cleanSubheadline(data.presentation.subheadline))
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060606]"
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

      {/* Compass icon */}
      <div
        className="relative z-10"
        style={{ animation: "fadeSlideUp 600ms ease-out 200ms both" }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
            transform: "scale(1.5)",
          }}
        />
        <svg width="100" height="100" viewBox="0 0 120 120" fill="none" className="relative">
          <circle cx="60" cy="60" r="57" stroke="#d4af37" strokeWidth="0.6" opacity="0.25" />
          <circle cx="60" cy="60" r="47" stroke="#d4af37" strokeWidth="0.8" opacity="0.4" />
          <circle
            cx="60"
            cy="60"
            r="25"
            stroke="#d4af37"
            strokeWidth="1.3"
            fill="rgba(212,175,55,0.05)"
            opacity="0.7"
          />
          <circle cx="60" cy="60" r="14" stroke="#d4af37" strokeWidth="0.9" fill="none" opacity="0.55" />
          <line x1="50" y1="70" x2="70" y2="50" stroke="#d4af37" strokeWidth="1.1" opacity="0.6" />
          <circle cx="60" cy="60" r="1.5" fill="#d4af37" opacity="0.45" />
        </svg>
      </div>

      {/* STRATEGY ACTIVATED label */}
      <p
        className="relative z-10 mt-7 font-mono text-[11px] uppercase tracking-[0.25em] text-[#d4af37]/70"
        style={{ animation: "fadeSlideUp 600ms ease-out 400ms both" }}
      >
        Strategy Activated
      </p>

      {/* Headline from strategy summary */}
      <h1
        className="relative z-10 mt-4 max-w-[520px] text-center font-serif text-4xl leading-tight text-[#f8efdc] sm:text-[42px]"
        style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 600ms both" }}
      >
        {headline ?? "Your Strategy Is Set"}
      </h1>

      {/* Subheadline */}
      <p
        className="relative z-10 mt-3.5 max-w-[400px] text-center text-[15px] leading-relaxed text-[#d9d1c3]/50"
        style={{ animation: "fadeSlideUp 600ms ease-out 700ms both" }}
      >
        {subheadline ?? "Meridian is ready to manage your portfolio based on this strategy."}
      </p>

      {/* Continue CTA */}
      <button
        autoFocus
        onClick={handleComplete}
        className="relative z-10 mt-11 cursor-pointer rounded-2xl bg-[#d4af37] px-12 py-4 text-[17px] font-semibold text-[#1a1507] shadow-[0_8px_30px_rgba(212,175,55,0.25)] transition-all hover:bg-[#e0bf4a] hover:shadow-[0_8px_40px_rgba(212,175,55,0.35)] active:scale-[0.99]"
        style={{ animation: "fadeSlideUp 600ms ease-out 900ms both" }}
      >
        Continue to Atlas →
      </button>
    </div>
  )
}
