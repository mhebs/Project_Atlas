"use client"

import { useState } from "react"
import { Starfield, type Star } from "./starfield"

const STARS: Star[] = [
  { top: "8%", left: "12%", size: 2, opacity: 0.35, type: "dot" },
  { top: "14%", left: "32%", size: 3, opacity: 0.5, type: "dot" },
  { top: "22%", left: "72%", size: 2, opacity: 0.4, type: "dot" },
  { top: "35%", left: "88%", size: 2, opacity: 0.3, type: "dot" },
  { top: "55%", left: "8%", size: 3, opacity: 0.45, type: "dot" },
  { top: "68%", left: "52%", size: 2, opacity: 0.35, type: "dot" },
  { top: "78%", left: "85%", size: 2, opacity: 0.3, type: "dot" },
  { top: "45%", left: "18%", size: 2, opacity: 0.4, type: "dot" },
  { top: "82%", left: "28%", size: 3, opacity: 0.45, type: "dot" },
  { top: "12%", left: "20%", size: 6, opacity: 0.55, type: "diamond" },
  { top: "28%", left: "80%", size: 5, opacity: 0.4, type: "diamond" },
  { top: "65%", left: "10%", size: 5, opacity: 0.35, type: "diamond" },
  { top: "75%", left: "90%", size: 6, opacity: 0.45, type: "diamond" },
  { top: "5%", left: "50%", size: 5, opacity: 0.3, type: "diamond" },
]

export function SplashOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060606]"
      style={exiting ? { animation: "fadeOut 300ms ease-in forwards" } : { animation: "fadeIn 600ms ease-out" }}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.04) 40%, transparent 70%)",
          }}
        />
      </div>

      {/* Starfield */}
      <Starfield stars={STARS} />

      {/* ATLAS logo */}
      <div
        className="relative z-10 flex flex-col items-center gap-1.5"
        style={{ animation: "fadeSlideUp 600ms ease-out 200ms both" }}
      >
        <svg width="18" height="16" viewBox="0 0 16 14" fill="none">
          <path d="M8 0.5L15.5 13.5H0.5L8 0.5Z" stroke="#d4af37" strokeWidth="1" fill="none" />
        </svg>
        <span className="font-mono text-[11px] tracking-[0.35em] text-[#d4af37]/75">ATLAS</span>
      </div>

      {/* Compass icon */}
      <div
        className="relative z-10 mt-8"
        style={{ animation: "fadeSlideUp 600ms ease-out 400ms both" }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
            transform: "scale(1.5)",
          }}
        />
        <svg width="140" height="140" viewBox="0 0 120 120" fill="none" className="relative">
          <circle cx="60" cy="60" r="57" stroke="#d4af37" strokeWidth="0.6" opacity="0.25" />
          <circle cx="60" cy="60" r="47" stroke="#d4af37" strokeWidth="0.8" opacity="0.4" />
          <circle cx="60" cy="60" r="37" stroke="#d4af37" strokeWidth="0.6" opacity="0.18" />
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

      {/* Tagline */}
      <p
        className="relative z-10 mt-9 max-w-[380px] text-center font-serif text-[22px] leading-relaxed text-[#d9d1c3]/55"
        style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 600ms both" }}
      >
        Your portfolio, guided by conviction — not noise.
      </p>

      {/* Begin CTA */}
      <button
        autoFocus
        onClick={handleDismiss}
        className="relative z-10 mt-12 cursor-pointer rounded-2xl bg-[#d4af37] px-14 py-4 text-[17px] font-semibold text-[#1a1507] shadow-[0_8px_30px_rgba(212,175,55,0.25)] transition-all hover:bg-[#e0bf4a] hover:shadow-[0_8px_40px_rgba(212,175,55,0.35)] active:scale-[0.99]"
        style={{ animation: "fadeSlideUp 600ms ease-out 800ms both" }}
      >
        Begin
      </button>
    </div>
  )
}
