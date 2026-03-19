"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { StrategySummaryResponse } from "@/lib/atlas-types"
import { SiliconGatePanel } from "./silicon-gate-panel"
import { StrategyApprovalPanel } from "./strategy-approval-panel"

interface StrategyApprovalOverlayProps {
  onApprove: () => void
  onEdit: () => void
}

export function StrategyApprovalOverlay({ onApprove, onEdit }: StrategyApprovalOverlayProps) {
  const [summary, setSummary] = useState<StrategySummaryResponse | null>(null)
  const [exiting, setExiting] = useState(false)
  const mountedRef = useRef(true)

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/strategy-summary", { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as StrategySummaryResponse
      if (!mountedRef.current) return
      setSummary(data)
    } catch {
      // Will show loading state until data arrives
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadSummary()
    return () => {
      mountedRef.current = false
    }
  }, [loadSummary])

  const handleApprove = () => {
    setExiting(true)
    setTimeout(onApprove, 300)
  }

  const handleEdit = () => {
    setExiting(true)
    setTimeout(onEdit, 300)
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
              Review your
              <br />
              strategy.
            </>
          }
          subheading="Confirm the plan before Atlas begins continuous execution."
          currentStep={4}
          totalSteps={5}
        />
      </div>

      {/* Right panel — 60% */}
      <div className="h-screen w-[60%]">
        {summary ? (
          <StrategyApprovalPanel
            summary={summary}
            onApprove={handleApprove}
            onEdit={handleEdit}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-ob-parchment">
            <div className="flex flex-col items-center gap-3">
              <div className="h-5 w-5 animate-spin border-2 border-ob-accent/20 border-t-ob-accent" />
              <p className="font-mono text-[11px] text-ob-muted">Loading strategy&hellip;</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
