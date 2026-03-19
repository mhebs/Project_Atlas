"use client"

import { useState } from "react"
import { SiliconGatePanel } from "./silicon-gate-panel"
import { StrategyPathPanel } from "./strategy-path-panel"
import { PresetListPanel } from "./preset-list-panel"
import { AI_DESIGN_SEED, type StrategyPathId, type PresetStrategy } from "./strategy-paths"

type OverlayView = "paths" | "presets"

interface StrategyCreationOverlayProps {
  onSelectPath: (pathId: StrategyPathId, seed?: string) => void
}

export function StrategyCreationOverlay({ onSelectPath }: StrategyCreationOverlayProps) {
  const [exiting, setExiting] = useState(false)
  const [view, setView] = useState<OverlayView>("paths")

  const handleExit = (pathId: StrategyPathId, seed?: string) => {
    setExiting(true)
    setTimeout(() => onSelectPath(pathId, seed), 300)
  }

  const handlePathSelect = (pathId: StrategyPathId) => {
    if (pathId === "preset") {
      setView("presets")
      return
    }
    if (pathId === "ai-design") {
      handleExit("ai-design", AI_DESIGN_SEED)
      return
    }
    // "build" — no seed
    handleExit("build")
  }

  const handlePresetSelect = (preset: PresetStrategy) => {
    handleExit("preset", preset.seedPrompt)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={exiting ? { animation: "fadeOut 300ms ease-in forwards" } : { animation: "fadeIn 600ms ease-out" }}
    >
      {/* Left panel — 60% */}
      <div className="h-screen w-[60%]">
        <SiliconGatePanel currentStep={1} totalSteps={5} />
      </div>

      {/* Right panel — 40% */}
      <div className="h-screen w-[40%]">
        {view === "paths" ? (
          <StrategyPathPanel onSelectPath={handlePathSelect} />
        ) : (
          <PresetListPanel
            onSelectPreset={handlePresetSelect}
            onBack={() => setView("paths")}
          />
        )}
      </div>
    </div>
  )
}
