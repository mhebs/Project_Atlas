"use client"

import { useState } from "react"
import { Navigation, Activity, Percent, BookOpen, type LucideIcon } from "lucide-react"

function ValuePropCard({ icon: Icon, label, description }: { icon: LucideIcon; label: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-[14px] border border-white/10 bg-white/5 p-5 shadow-[0_8px_20px_rgba(0,0,0,0.15)] backdrop-blur-[16px]">
      <Icon size={22} className="text-[#C9A84C]" />
      <span className="text-center font-sans text-[11px] font-semibold tracking-[2.5px] text-white/75">
        {label}
      </span>
      <p className="text-center font-sans text-[12px] leading-[1.5] text-white/40">
        {description}
      </p>
    </div>
  )
}

export function SplashOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[var(--eg-bg)]"
      style={exiting ? { animation: "fadeOut 300ms ease-in forwards" } : { animation: "fadeIn 600ms ease-out" }}
    >
      {/* Background glow layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(26,58,122,0.30) 0%, transparent 85%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, rgba(26,58,122,0.25) 0%, transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 20%, rgba(201,168,76,0.05) 0%, transparent 50%)",
        }}
      />

      {/* Logo — top left */}
      <div
        className="absolute left-10 top-8 z-10 flex items-center gap-2"
        style={{ animation: "fadeSlideUp 600ms ease-out 200ms both" }}
      >
        <Navigation size={14} className="text-white/35" />
        <span className="font-mono text-[11px] tracking-[2.5px] text-white/35">
          ATLAS
        </span>
      </div>

      {/* Centered glass panel */}
      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <div
          className="flex w-full max-w-[760px] flex-col rounded-[18px] border border-white/10 bg-white/5 p-14 shadow-[0_1px_0_rgba(255,255,255,0.15),0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-[24px]"
          style={{ animation: "fadeSlideUp 600ms ease-out 300ms both" }}
        >
          {/* Label */}
          <span
            className="text-center font-mono text-[11px] tracking-[2.5px] text-white/45"
            style={{ animation: "fadeSlideUp 600ms ease-out 400ms both" }}
          >
            WHAT IS ATLAS
          </span>

          {/* Headline */}
          <div
            className="mt-4 flex flex-col items-center gap-1.5"
            style={{ animation: "fadeSlideUp 600ms ease-out 500ms both" }}
          >
            <div className="flex items-center justify-center gap-2.5">
              <span className="font-serif text-[44px] italic text-[#C9A84C]">You</span>
              <span className="font-serif text-[40px] text-white/90">define the strategy.</span>
            </div>
            <div className="flex items-center justify-center gap-2.5">
              <span className="font-serif text-[44px] italic text-[#C9A84C]">Meridian</span>
              <span className="font-serif text-[40px] text-white/90">executes it.</span>
            </div>
          </div>

          {/* Body */}
          <p
            className="mx-auto mt-4 max-w-[620px] text-center font-sans text-[15px] leading-[1.65] text-white/55"
            style={{ animation: "fadeSlideUp 600ms ease-out 600ms both" }}
          >
            Atlas is not an AI stock picker. It&apos;s execution infrastructure — a system that
            follows your rules, sets your guardrails, logs your strategy&apos;s thesis, and executes
            with the discipline you wish you had.
          </p>

          {/* Spacer */}
          <div className="h-9" />

          {/* Value proposition cards */}
          <div
            className="flex gap-4"
            style={{ animation: "fadeSlideUp 600ms ease-out 700ms both" }}
          >
            <ValuePropCard
              icon={Activity}
              label="CONTINUOUS EXECUTION"
              description="Your thesis, monitored and acted on 24/7."
            />
            <ValuePropCard
              icon={Percent}
              label="TAX-AWARE BY DEFAULT"
              description="Harvesting, deferral, and location — built in."
            />
            <ValuePropCard
              icon={BookOpen}
              label="FULL TRANSPARENCY"
              description="Every decision logged. Every trade explained."
            />
          </div>

          {/* Spacer */}
          <div className="h-8" />

          {/* CTA */}
          <div
            className="flex justify-center"
            style={{ animation: "fadeSlideUp 600ms ease-out 800ms both" }}
          >
            <button
              autoFocus
              onClick={handleDismiss}
              className="cursor-pointer rounded-[14px] border border-[#C9A84C]/20 bg-white/5 px-14 py-4 font-sans text-[16px] font-medium text-[#C9A84C] shadow-[0_12px_40px_rgba(0,0,0,0.20),0_-1px_2px_rgba(255,255,255,0.10)] backdrop-blur-[20px] transition-all hover:border-[#C9A84C]/40 hover:bg-white/10 active:scale-[0.99]"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* Trust footer */}
      <div
        className="absolute inset-x-0 bottom-8 z-10 flex justify-center"
        style={{ animation: "fadeSlideUp 600ms ease-out 900ms both" }}
      >
        <span className="font-sans text-[11px] text-white/25">
          Bank-level encryption&ensp;·&ensp;You stay in control&ensp;·&ensp;Powered by Alpaca
        </span>
      </div>
    </div>
  )
}
