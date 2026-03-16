"use client"

import type { ReactNode } from "react"
import { AtomCanvasGreen } from "./atom-canvas-green"

interface SiliconGatePanelProps {
  headline?: ReactNode
  subheading?: string
  currentStep?: number
  totalSteps?: number
}

export function SiliconGatePanel({ headline, subheading, currentStep, totalSteps }: SiliconGatePanelProps = {}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#080e0a]">
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial emerald glow behind atom */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[400px] w-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(20,80,50,0.18) 0%, rgba(20,80,50,0.06) 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-16 py-20">
        {/* ATLAS wordmark */}
        <div
          className="flex flex-col items-center gap-2"
          style={{ animation: "fadeSlideUp 600ms ease-out 200ms both" }}
        >
          <span className="font-serif text-[13px] tracking-[0.3em] text-[#f5f3ee]/50">
            ATLAS
          </span>
          <div className="h-px w-12 bg-white/[0.06]" />
        </div>

        {/* Atom animation */}
        <div
          className="mt-10"
          style={{ animation: "fadeSlideUp 600ms ease-out 400ms both" }}
        >
          <AtomCanvasGreen />
        </div>

        {/* Headline */}
        <h1
          className="mt-10 max-w-[440px] text-center font-serif text-[40px] leading-[1.15] text-[#f5f3ee]"
          style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 600ms both" }}
        >
          {headline ?? (
            <>
              Your strategy.
              <br />
              Continuously executed.
            </>
          )}
        </h1>

        {/* Subheading */}
        <p
          className="mt-5 max-w-[340px] text-center font-sans text-[14px] leading-relaxed text-ob-muted"
          style={{ animation: "fadeSlideUp 600ms ease-out 800ms both" }}
        >
          {subheading ?? "Algorithmic execution powered by conviction. Atlas monitors, rebalances, and acts \u2014 so you don\u0027t have to."}
        </p>

        {/* Step indicator */}
        {currentStep != null && totalSteps != null && (
          <div
            className="mt-6 flex items-center gap-2"
            style={{ animation: "fadeSlideUp 600ms ease-out 900ms both" }}
          >
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 w-6 ${i + 1 <= currentStep ? "bg-ob-gold" : "bg-white/[0.08]"}`}
              />
            ))}
            <span className="ml-2 font-mono text-[11px] tracking-wider text-ob-gold/60">
              {String(currentStep).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
