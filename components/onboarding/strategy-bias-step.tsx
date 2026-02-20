"use client";

import { useState } from "react";
import { useAtlas } from "@/context/atlas-context";
import type { StrategyBias } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StrategyBiasStepProps {
  onActivate: () => void;
}

const options: { value: StrategyBias; label: string }[] = [
  { value: "Buy strong companies and hold", label: "Buy strong companies and hold" },
  { value: "Trade structured setups", label: "Trade structured setups" },
  { value: "Follow macro trends", label: "Follow macro trends" },
  { value: "Blend strategies intelligently", label: "Blend strategies intelligently" },
];

const agentResponses: Record<StrategyBias, string> = {
  "Buy strong companies and hold":
    "Quality Hold strategy. I'll focus on fundamentally strong companies with durable competitive advantages and let compounding do the work.",
  "Trade structured setups":
    "Trend Following strategy. I'll identify high-probability setups with defined entry, exit, and position sizing rules.",
  "Follow macro trends":
    "Macro Tilt strategy. I'll position around economic cycles, rate environments, and cross-asset flows for structural tailwinds.",
  "Blend strategies intelligently":
    "Blended strategy. I'll dynamically allocate across quality holdings, tactical setups, and macro themes based on market conditions.",
};

export function StrategyBiasStep({ onActivate }: StrategyBiasStepProps) {
  const { state, setStrategyBias } = useAtlas();
  const [selected, setSelected] = useState<StrategyBias | null>(state.strategyBias);

  const handleSelect = (s: StrategyBias) => {
    setSelected(s);
    setStrategyBias(s);
  };

  return (
    <div className="flex flex-col">
      <h2 className="mb-2 text-2xl font-serif tracking-tight text-foreground">
        Which sounds more like you?
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        This shapes the core strategy your agent will follow.
      </p>

      <div className="flex flex-col gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`rounded-xl border p-4 text-left text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-atlas-green-light/50 text-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/30 hover:shadow-sm"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Agent response */}
      {selected && (
        <div className="mt-6 rounded-xl bg-atlas-parchment-dark p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Atlas:</p>
          <p className="text-sm leading-relaxed text-foreground italic">
            {agentResponses[selected]}
          </p>
        </div>
      )}

      <Button
        onClick={onActivate}
        disabled={!selected}
        className="mt-6 w-full gap-2 rounded-xl bg-primary py-6 text-base font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
      >
        <Sparkles className="h-4 w-4" />
        Activate my agent
      </Button>
    </div>
  );
}
