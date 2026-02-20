"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Atlas logo mark */}
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
        <span className="text-2xl font-bold text-primary-foreground font-serif">A</span>
      </div>

      <h1 className="mb-4 text-3xl font-serif tracking-tight text-foreground text-balance">
        Meet your investing partner.
      </h1>

      <p className="mb-2 text-base leading-relaxed text-muted-foreground text-pretty">
        A strategy-based agent that works 24/7 — under your rules.
      </p>

      <p className="mb-10 text-sm leading-relaxed text-muted-foreground/70">
        No hype. No guessing. Just disciplined, transparent execution aligned to your mandate.
      </p>

      <Button
        onClick={onNext}
        className="w-full gap-2 rounded-xl bg-primary py-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
      >
        {"Let's build your mandate"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
