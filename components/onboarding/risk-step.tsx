"use client";

import { useState } from "react";
import { useAtlas } from "@/context/atlas-context";
import type { RiskResponse, RiskFollowUp } from "@/lib/types";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RiskStepProps {
  onNext: () => void;
}

const riskOptions: { value: RiskResponse; label: string }[] = [
  { value: "Add more capital", label: "Add more capital" },
  { value: "Hold steady", label: "Hold steady" },
  { value: "Reduce exposure", label: "Reduce exposure" },
  { value: "Exit fully", label: "Exit fully" },
];

export function RiskStep({ onNext }: RiskStepProps) {
  const { state, setRiskResponse, setRiskFollowUp } = useAtlas();
  const [selected, setSelected] = useState<RiskResponse | null>(state.riskResponse);
  const [followUp, setFollowUp] = useState<RiskFollowUp | null>(state.riskFollowUp);

  const handleSelect = (r: RiskResponse) => {
    setSelected(r);
    setRiskResponse(r);
    setFollowUp(null);
  };

  const handleFollowUp = (f: RiskFollowUp) => {
    setFollowUp(f);
    setRiskFollowUp(f);
  };

  const needsFollowUp = selected === "Add more capital" || selected === "Exit fully";
  const canContinue = selected && (!needsFollowUp || followUp);

  const followUpQuestion =
    selected === "Add more capital"
      ? "How quickly would you add?"
      : "Do you want hard stops or approval before exiting?";

  const followUpOptions: { value: RiskFollowUp; label: string }[] =
    selected === "Add more capital"
      ? [
          { value: "Immediately", label: "Immediately" },
          { value: "Over weeks", label: "Over weeks" },
        ]
      : [
          { value: "Hard stop", label: "Hard stop" },
          { value: "Ask me", label: "Ask me first" },
        ];

  return (
    <div className="flex flex-col">
      <h2 className="mb-2 text-2xl font-serif tracking-tight text-foreground">
        Risk calibration
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        If your portfolio dropped 15% in a month, what would you do?
      </p>

      <div className="flex flex-col gap-3">
        {riskOptions.map((opt) => {
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

      {/* Adaptive follow-up */}
      {needsFollowUp && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-foreground">
            {followUpQuestion}
          </p>
          <div className="flex gap-3">
            {followUpOptions.map((opt) => {
              const isSelected = followUp === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleFollowUp(opt.value)}
                  className={`flex-1 rounded-xl border p-3 text-center text-sm font-medium transition-all duration-200 ${
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
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!canContinue}
        className="mt-6 w-full gap-2 rounded-xl bg-primary py-6 text-base font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
