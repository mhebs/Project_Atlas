"use client"

import type { StrategyPath, StrategyPathId } from "./strategy-paths"

interface StrategyPathTileProps {
  path: StrategyPath
  onSelect: (id: StrategyPathId) => void
}

export function StrategyPathTile({ path, onSelect }: StrategyPathTileProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(path.id)}
      className="group w-full cursor-pointer border border-ob-border bg-white/60 p-6 text-left transition-all hover:border-ob-accent/30 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ob-accent-bright"
    >
      {/* Step number + badge row */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[12px] font-light tracking-wider text-ob-gold">
          {path.stepNumber}
        </span>
        {path.badge && (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ob-gold bg-ob-gold/10 px-2 py-0.5">
            {path.badge}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-2 font-sans text-[16px] font-medium text-ob-accent">
        {path.title}
      </h3>

      {/* Description */}
      <p className="mt-1.5 font-sans text-[14px] leading-relaxed text-ob-muted">
        {path.description}
      </p>

      {/* Preset previews */}
      {path.previewPresets && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {path.previewPresets.map((preset) => (
            <span
              key={preset.id}
              className="border border-ob-border bg-ob-parchment px-2.5 py-1 font-mono text-[11px] text-ob-muted transition-colors group-hover:border-ob-accent/20"
            >
              {preset.name}
            </span>
          ))}
          {path.moreCount && (
            <span className="font-mono text-[11px] text-ob-muted/60">
              +{path.moreCount} more
            </span>
          )}
        </div>
      )}
    </button>
  )
}
