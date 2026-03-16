"use client"

import { ArrowLeft } from "lucide-react"
import { PRESET_STRATEGIES, type PresetStrategy } from "./strategy-paths"

interface PresetListPanelProps {
  onSelectPreset: (preset: PresetStrategy) => void
  onBack: () => void
}

export function PresetListPanel({ onSelectPreset, onBack }: PresetListPanelProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-ob-parchment px-16 py-20">
      <div className="mx-auto w-full max-w-[480px]">
        {/* Back link */}
        <button
          type="button"
          onClick={onBack}
          className="group mb-6 flex cursor-pointer items-center gap-2 font-mono text-[12px] text-ob-muted transition-colors hover:text-ob-accent"
          style={{ animation: "fadeSlideUp 600ms ease-out 200ms both" }}
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        {/* Eyebrow */}
        <p
          className="font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-ob-accent"
          style={{ animation: "fadeSlideUp 600ms ease-out 250ms both" }}
        >
          Preset strategies
        </p>

        {/* Heading */}
        <h2
          className="mt-3 font-serif text-[28px] leading-tight text-ob-accent"
          style={{ fontStyle: "italic", animation: "fadeSlideUp 600ms ease-out 350ms both" }}
        >
          Choose a starting point
        </h2>

        {/* Subtitle */}
        <p
          className="mt-2 font-sans text-[14px] text-ob-muted"
          style={{ animation: "fadeSlideUp 600ms ease-out 400ms both" }}
        >
          Pick a preset and Atlas will customize it with you.
        </p>

        {/* Preset cards */}
        <div
          className="mt-8 flex flex-col gap-3"
          style={{ animation: "fadeSlideUp 600ms ease-out 500ms both" }}
        >
          {PRESET_STRATEGIES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className="group w-full cursor-pointer border border-ob-border bg-white/60 p-5 text-left transition-all hover:border-ob-accent/30 hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ob-accent-bright"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-sans text-[15px] font-medium text-ob-accent">
                    {preset.name}
                  </h3>
                  <p className="mt-1 font-sans text-[13px] text-ob-muted">
                    {preset.shortDescription}
                  </p>
                </div>
                <span className="mt-0.5 shrink-0 font-mono text-[11px] text-ob-muted/40 transition-colors group-hover:text-ob-accent/60">
                  &rarr;
                </span>
              </div>
              <p className="mt-2.5 line-clamp-2 font-mono text-[11px] leading-relaxed text-ob-muted/50">
                &ldquo;{preset.seedPrompt}&rdquo;
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
