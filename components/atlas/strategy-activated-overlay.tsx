"use client"

import { useEffect, useRef, useState } from "react"
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

const AUTO_ADVANCE_MS = 2800

export function StrategyActivatedOverlay({ onComplete }: { onComplete: () => void }) {
  const [exiting, setExiting] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const timer = setTimeout(() => {
      if (!mountedRef.current) return
      setExiting(true)
      setTimeout(onComplete, 400)
    }, AUTO_ADVANCE_MS)
    return () => {
      mountedRef.current = false
      clearTimeout(timer)
    }
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060606]"
      style={exiting ? { animation: "fadeOut 400ms ease-in forwards" } : { animation: "fadeIn 500ms ease-out" }}
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

      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Compass icon */}
        <div
          className="relative"
          style={{ animation: "fadeSlideUp 600ms ease-out 100ms both" }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
              transform: "scale(1.5)",
            }}
          />
          <svg width="64" height="64" viewBox="0 0 120 120" fill="none" className="relative">
            <circle cx="60" cy="60" r="57" stroke="#d4af37" strokeWidth="0.6" opacity="0.25" />
            <circle cx="60" cy="60" r="47" stroke="#d4af37" strokeWidth="0.8" opacity="0.4" />
            <circle cx="60" cy="60" r="25" stroke="#d4af37" strokeWidth="1.3" fill="rgba(212,175,55,0.05)" opacity="0.7" />
            <circle cx="60" cy="60" r="14" stroke="#d4af37" strokeWidth="0.9" fill="none" opacity="0.55" />
            <line x1="50" y1="70" x2="70" y2="50" stroke="#d4af37" strokeWidth="1.1" opacity="0.6" />
            <circle cx="60" cy="60" r="1.5" fill="#d4af37" opacity="0.45" />
          </svg>
        </div>

        {/* Label */}
        <p
          className="mt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-[#d4af37]/70"
          style={{ animation: "fadeSlideUp 600ms ease-out 300ms both" }}
        >
          Strategy Activated
        </p>

        {/* Headline */}
        <h1
          className="mt-4 max-w-[420px] text-center font-serif text-[34px] leading-tight text-[#f8efdc]"
          style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 500ms both" }}
        >
          Atlas is live.
        </h1>

        {/* Subheadline */}
        <p
          className="mt-3 max-w-[340px] text-center text-[15px] leading-relaxed text-[#d9d1c3]/45"
          style={{ animation: "fadeSlideUp 600ms ease-out 650ms both" }}
        >
          Your strategy is now being continuously executed.
        </p>
      </div>
    </div>
  )
}
