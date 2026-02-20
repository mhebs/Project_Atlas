"use client";

import { useState } from "react";
import { useAtlas } from "@/context/atlas-context";
import type { Engagement } from "@/lib/types";
import { ArrowRight, Cpu, Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EngagementStepProps {
  onNext: () => void;
}

const options: { value: Engagement; icon: typeof Cpu; description: string }[] = [
  {
    value: "Just execute my strategy",
    icon: Cpu,
    description: "Full autonomy. I'll act within your guardrails without asking.",
  },
  {
    value: "Notify me before major reallocations",
    icon: Bell,
    description: "I'll handle routine adjustments but flag big moves first.",
  },
  {
    value: "Ask me before every trade",
    icon: MessageSquare,
    description: "I'll propose actions and wait for your approval each time.",
  },
];

export function EngagementStep({ onNext }: EngagementStepProps) {
  const { state, setEngagement } = useAtlas();
  const [selected, setSelected] = useState<Engagement | null>(state.engagement);

  const handleSelect = (e: Engagement) => {
    setSelected(e);
    setEngagement(e);
  };

  return (
    <div className="flex flex-col">
      <h2 className="mb-2 text-2xl font-serif tracking-tight text-foreground">
        How involved do you want to be?
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        This defines how much autonomy your agent has.
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
                <span className="text-sm font-medium text-foreground">{opt.value}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {opt.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

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
