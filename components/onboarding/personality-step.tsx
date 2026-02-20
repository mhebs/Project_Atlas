"use client";

import { useState } from "react";
import { useAtlas } from "@/context/atlas-context";
import type { Personality } from "@/lib/types";
import { ArrowRight, Shield, TrendingUp, Zap, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PersonalityStepProps {
  onNext: () => void;
}

const options: { value: Personality; label: string; icon: typeof Shield; description: string }[] = [
  {
    value: "Preserve & Compound",
    label: "Preserve & Compound",
    icon: Shield,
    description: "Capital protection with steady compounding over time",
  },
  {
    value: "Systematic Growth",
    label: "Systematic Growth",
    icon: TrendingUp,
    description: "Rules-based approach targeting consistent above-market returns",
  },
  {
    value: "Tactical & Opportunistic",
    label: "Tactical & Opportunistic",
    icon: Zap,
    description: "Active positioning around market dislocations and themes",
  },
  {
    value: "Experimental",
    label: "Experimental",
    icon: FlaskConical,
    description: "Willing to test new strategies with a portion of capital",
  },
];

const agentResponses: Record<Personality, string> = {
  "Preserve & Compound":
    "Understood. I'll prioritize capital preservation with a steady compounding approach. Lower volatility, higher certainty.",
  "Systematic Growth":
    "Good choice. I'll build a disciplined, rules-based portfolio targeting consistent growth without emotional deviation.",
  "Tactical & Opportunistic":
    "Noted. I'll stay alert to market dislocations and position the tactical sleeve more aggressively within your guardrails.",
  Experimental:
    "Interesting. I'll allocate a dedicated experimental sleeve for testing new strategies while keeping the core portfolio protected.",
};

export function PersonalityStep({ onNext }: PersonalityStepProps) {
  const { state, setPersonality } = useAtlas();
  const [selected, setSelected] = useState<Personality | null>(state.personality);

  const handleSelect = (p: Personality) => {
    setSelected(p);
    setPersonality(p);
  };

  return (
    <div className="flex flex-col">
      <h2 className="mb-2 text-2xl font-serif tracking-tight text-foreground">
        What describes your investing personality?
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        This helps shape how your agent approaches the market.
      </p>

      <div className="flex flex-col gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-atlas-green-light/50 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {opt.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Agent acknowledgement */}
      {selected && (
        <div className="mt-6 rounded-xl bg-atlas-parchment-dark p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Atlas:</p>
          <p className="text-sm leading-relaxed text-foreground italic">
            {agentResponses[selected]}
          </p>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!selected}
        className="mt-6 w-full gap-2 rounded-xl bg-primary py-6 text-base font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
