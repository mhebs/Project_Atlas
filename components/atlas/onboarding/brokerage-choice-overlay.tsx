"use client"

import { useState } from "react"
import { SiliconGatePanel } from "./silicon-gate-panel"
import { ChevronRight } from "lucide-react"

interface BrokerageChoiceOverlayProps {
  onChooseExisting: () => void
  onBack: () => void
}

export function BrokerageChoiceOverlay({ onChooseExisting, onBack }: BrokerageChoiceOverlayProps) {
  const [exiting, setExiting] = useState(false)

  const handleChooseExisting = () => {
    setExiting(true)
    setTimeout(onChooseExisting, 300)
  }

  const handleBack = () => {
    setExiting(true)
    setTimeout(onBack, 300)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={exiting ? { animation: "fadeOut 300ms ease-in forwards" } : { animation: "fadeIn 600ms ease-out" }}
    >
      {/* Left panel — 40% */}
      <div className="h-screen w-[40%]">
        <SiliconGatePanel
          headline={
            <>
              <em>Meridian</em>
              <br />
              is standing by.
            </>
          }
          subheading="Connect your Alpaca account to activate your strategy."
          currentStep={2}
          totalSteps={5}
        />
      </div>

      {/* Right panel — 60% */}
      <div className="relative h-screen w-[60%] bg-ob-parchment">
        {/* Back nav */}
        <button
          onClick={handleBack}
          className="absolute left-14 top-8 font-sans text-[13px] text-[#999] transition-colors hover:text-[#666]"
        >
          &larr; Back
        </button>

        {/* Center content */}
        <div className="flex h-full items-center justify-center">
          <div className="w-[480px]">
            {/* Eyebrow */}
            <span className="font-sans text-[11px] tracking-[2.5px] text-ob-gold">
              GET STARTED
            </span>

            <div className="h-5" />

            {/* Headline */}
            <h2 className="font-sans text-[36px] font-semibold leading-[1.2] text-[#1A1A1A]">
              How do you want to connect?
            </h2>

            <div className="h-2" />

            {/* Subtext */}
            <p className="font-sans text-[15px] leading-relaxed text-[#666]">
              Atlas executes through Alpaca Markets. Your capital stays in your brokerage account at all times.
            </p>

            <div className="h-10" />

            {/* Card 1 — I have an Alpaca account */}
            <button
              onClick={handleChooseExisting}
              className="flex w-full items-center gap-4 rounded-xl border border-[#D0D8E8] bg-white px-6 py-5 text-left transition-colors hover:border-ob-gold/40 hover:bg-white/80"
            >
              <div className="flex flex-1 flex-col gap-1">
                <span className="font-sans text-[15px] font-medium text-[#1A1A1A]">
                  I have an Alpaca account
                </span>
                <span className="font-sans text-[12px] text-[#999]">
                  Connect via API credentials. Takes 2 minutes.
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#999]" />
            </button>

            <div className="h-3" />

            {/* Card 2 — I need to create one (inactive) */}
            <div className="flex w-full cursor-not-allowed items-center gap-4 rounded-xl border border-[#D0D8E8] bg-white px-6 py-5 opacity-50">
              <div className="flex flex-1 flex-col gap-1">
                <span className="font-sans text-[15px] font-medium text-[#1A1A1A]">
                  I need to create one
                </span>
                <span className="font-sans text-[12px] text-[#999]">
                  Free account. No minimum deposit. FINRA-registered.
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#999]" />
            </div>

            <div className="h-8" />

            {/* Divider */}
            <div className="h-px w-full bg-ob-gold/15" />

            <div className="h-4" />

            {/* Trust line */}
            <p className="text-center font-sans text-[12px] text-[#999]">
              Execution via Alpaca Markets &middot; SEC-registered broker-dealer
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
