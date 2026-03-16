"use client"

import { StrategyPathTile } from "./strategy-path-tile"
import { STRATEGY_PATHS, type StrategyPathId } from "./strategy-paths"

interface StrategyPathPanelProps {
  onSelectPath: (pathId: StrategyPathId) => void
}

export function StrategyPathPanel({ onSelectPath }: StrategyPathPanelProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center overflow-y-auto bg-ob-parchment px-16 py-20">
      <div className="mx-auto w-full max-w-[480px]">
        {/* Eyebrow */}
        <p
          className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ob-accent"
          style={{ animation: "fadeSlideUp 600ms ease-out 300ms both" }}
        >
          Define your strategy
        </p>

        {/* Heading */}
        <h2
          className="mt-3 font-serif text-[28px] leading-tight text-ob-accent"
          style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 450ms both" }}
        >
          How would you like to get started?
        </h2>

        {/* Subtitle */}
        <p
          className="mt-2 font-sans text-[14px] text-ob-muted"
          style={{ animation: "fadeSlideUp 600ms ease-out 550ms both" }}
        >
          Choose a path below. You can always change your strategy later.
        </p>

        {/* Strategy path tiles */}
        <div
          className="mt-8 flex flex-col gap-4"
          style={{ animation: "fadeSlideUp 600ms ease-out 650ms both" }}
        >
          {STRATEGY_PATHS.map((path) => (
            <StrategyPathTile
              key={path.id}
              path={path}
              onSelect={onSelectPath}
            />
          ))}
        </div>

        {/* Footer */}
        <p
          className="mt-6 font-mono text-[11px] text-ob-muted/60"
          style={{ animation: "fadeSlideUp 600ms ease-out 800ms both" }}
        >
          ~ 2 min estimated setup
        </p>
      </div>
    </div>
  )
}
