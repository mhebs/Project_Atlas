"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { StrategySummaryResponse } from "@/lib/atlas-types"
import { Starfield, type Star } from "./starfield"

const STARS: Star[] = [
  { top: "6%", left: "10%", size: 2, opacity: 0.35, type: "dot" },
  { top: "11%", left: "30%", size: 3, opacity: 0.55, type: "dot" },
  { top: "8%", left: "54%", size: 2, opacity: 0.4, type: "dot" },
  { top: "15%", left: "82%", size: 2, opacity: 0.45, type: "dot" },
  { top: "25%", left: "16%", size: 3, opacity: 0.55, type: "dot" },
  { top: "22%", left: "68%", size: 3, opacity: 0.55, type: "dot" },
  { top: "30%", left: "90%", size: 2, opacity: 0.4, type: "dot" },
  { top: "36%", left: "6%", size: 2, opacity: 0.3, type: "dot" },
  { top: "42%", left: "34%", size: 3, opacity: 0.5, type: "dot" },
  { top: "46%", left: "58%", size: 2, opacity: 0.45, type: "dot" },
  { top: "55%", left: "78%", size: 3, opacity: 0.55, type: "dot" },
  { top: "62%", left: "20%", size: 2, opacity: 0.4, type: "dot" },
  { top: "70%", left: "50%", size: 2, opacity: 0.35, type: "dot" },
  { top: "75%", left: "85%", size: 2, opacity: 0.3, type: "dot" },
  // Diamonds
  { top: "10%", left: "18%", size: 7, opacity: 0.65, type: "diamond" },
  { top: "20%", left: "74%", size: 6, opacity: 0.5, type: "diamond" },
  { top: "4%", left: "44%", size: 5, opacity: 0.4, type: "diamond" },
  { top: "33%", left: "4%", size: 6, opacity: 0.5, type: "diamond" },
  { top: "52%", left: "92%", size: 5, opacity: 0.35, type: "diamond" },
  { top: "68%", left: "12%", size: 5, opacity: 0.4, type: "diamond" },
]

function formatShortDate(mtimeMs: number | null) {
  if (!mtimeMs) return ""
  return new Date(mtimeMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function StrategyScreen() {
  const [summary, setSummary] = useState<StrategySummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await fetch("/api/workspace/strategy-summary", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to load strategy summary")
      }
      if (!mountedRef.current) return
      setSummary(data as StrategySummaryResponse)
      setError(null)
    } catch (loadError) {
      if (!mountedRef.current) return
      setError(loadError instanceof Error ? loadError.message : "Failed to load strategy summary")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void load()

    return () => {
      mountedRef.current = false
    }
  }, [load])

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#F5F0E8] text-[#1A1507]">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(200, 164, 58, 0.06), transparent 60%)" }} />
      </div>

      {/* Starfield */}
      <Starfield stars={STARS} />

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[580px] flex-col items-center px-6 pt-10 pb-14">
          {/* ATLAS logo */}
          <div className="mb-12 flex flex-col items-center gap-1.5">
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <path d="M8 0.5L15.5 13.5H0.5L8 0.5Z" stroke="#d4af37" strokeWidth="1" fill="none" />
            </svg>
            <span className="font-mono text-[10px] tracking-[0.3em] text-[#d4af37]/80">
              ATLAS
            </span>
          </div>

          {/* Compass icon */}
          <div className="relative mb-10">
            {/* Glow behind icon */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)",
                transform: "scale(1.6)",
              }}
            />
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="relative">
              <circle
                cx="60"
                cy="60"
                r="57"
                stroke="#d4af37"
                strokeWidth="0.7"
                opacity="0.3"
              />
              <circle
                cx="60"
                cy="60"
                r="47"
                stroke="#d4af37"
                strokeWidth="0.9"
                opacity="0.5"
              />
              <circle
                cx="60"
                cy="60"
                r="37"
                stroke="#d4af37"
                strokeWidth="0.7"
                opacity="0.2"
              />
              <circle
                cx="60"
                cy="60"
                r="25"
                stroke="#d4af37"
                strokeWidth="1.5"
                fill="rgba(212,175,55,0.06)"
                opacity="0.8"
              />
              {/* Compass line */}
              <circle
                cx="60"
                cy="60"
                r="14"
                stroke="#d4af37"
                strokeWidth="1"
                fill="none"
                opacity="0.65"
              />
              <line
                x1="50"
                y1="70"
                x2="70"
                y2="50"
                stroke="#d4af37"
                strokeWidth="1.2"
                opacity="0.7"
              />
              <circle cx="60" cy="60" r="1.5" fill="#d4af37" opacity="0.5" />
            </svg>
          </div>

          {/* Loading state */}
          {loading && !summary && (
            <p className="mb-8 text-sm text-[#8C8375]">Loading strategy…</p>
          )}
          {error && !summary && (
            <p className="mb-8 text-sm text-[#f2a6a6]">{error}</p>
          )}

          {summary && (
            <>
              {/* Headline */}
              <h1 className="mb-5 text-center font-serif text-4xl leading-tight text-[#1A1507] sm:text-5xl" style={{ fontStyle: "italic" }}>
                {summary.presentation.headline}
              </h1>

              {/* Subheadline */}
              <p className="mb-12 max-w-md text-center text-[15px] leading-relaxed text-[#6B6259]">
                {summary.presentation.subheadline}
              </p>

              {/* Strategy card */}
              <section className="w-full overflow-hidden rounded-2xl border border-[#c8a43a]/25 bg-[#FFFFFF] shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-[#c8a43a]/12 px-6 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9A7B2A]">
                    {summary.presentation.panelTitle}
                  </p>
                  <p className="font-mono text-[11px] text-[#8C8375]">
                    {formatShortDate(summary.mtimeMs)}
                  </p>
                </div>

                {/* 2x2 tile grid */}
                <div className="grid grid-cols-2">
                  {summary.presentation.tiles.map((tile, index) => (
                    <div
                      key={tile.id}
                      className={[
                        "px-6 py-6",
                        index % 2 === 1 ? "border-l border-[#c8a43a]/12" : "",
                        index >= 2 ? "border-t border-[#c8a43a]/12" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9A7B2A]">
                        {tile.label}
                      </p>
                      <p className="mt-3 text-[17px] leading-snug text-[#1A1507]">
                        {tile.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footnote strip */}
                <div className="border-t border-[#c8a43a]/12 bg-[#F5F0E8]/60 px-6 py-3.5">
                  <p className="flex items-center gap-2.5 text-[13px] italic text-[#8C8375]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0"
                    >
                      <path
                        d="M9.5 1L4 9h4l-1.5 6L13 7H9l.5-6Z"
                        fill="#d4af37"
                        opacity="0.65"
                      />
                    </svg>
                    {summary.presentation.footnote}
                  </p>
                </div>
              </section>

              {/* Activate button */}
              <button className="mt-10 w-full cursor-pointer rounded-2xl bg-[#d4af37] px-8 py-5 text-center text-lg font-semibold text-[#1a1507] shadow-[0_8px_30px_rgba(212,175,55,0.25)] transition-all hover:bg-[#e0bf4a] hover:shadow-[0_8px_40px_rgba(212,175,55,0.35)] active:scale-[0.99]">
                Activate Atlas →
              </button>

              {/* Raw STRATEGY.md */}
              {summary.rawContent && (
                <section className="mt-10 w-full overflow-hidden rounded-2xl border border-[#c8a43a]/25 bg-[#FFFFFF] shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
                  <div className="border-b border-[#c8a43a]/12 px-6 py-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9A7B2A]">
                      STRATEGY.MD — RAW
                    </p>
                  </div>
                  <div className="px-6 py-5">
                    <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-[#3D3527]">
                      {summary.rawContent}
                    </pre>
                  </div>
                </section>
              )}

              {/* Footer */}
              <p className="mt-6 text-center text-[13px] text-[#8C8375]">
                You can adjust this strategy anytime by chatting with Atlas.
              </p>
              <button className="mt-2 cursor-pointer text-[13px] text-[#8C8375] transition-colors hover:text-[#6B6259]">
                ← Review and adjust
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
