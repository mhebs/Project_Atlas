"use client";

import { ArrowRight, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: () => void;
}

function HumanAgentMark() {
  return (
    <div className="mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-[22px] sm:rounded-[28px] bg-primary/10 ring-1 ring-primary/15 shadow-sm">
      <div className="flex h-14 w-14 sm:h-17 sm:w-17 items-center justify-center rounded-xl sm:rounded-2xl bg-background/70 ring-1 ring-primary/10">
        <svg viewBox="0 0 64 64" className="h-10 w-10 sm:h-12 sm:w-12" fill="none" aria-hidden="true">
          {/* connection */}
          <path
            d="M18 38 C26 30, 38 30, 46 36"
            stroke="currentColor"
            strokeWidth="2.4"
            className="text-primary/70"
            strokeLinecap="round"
          />
          {/* human */}
          <circle cx="18" cy="40" r="6.8" fill="currentColor" className="text-primary" />
          {/* agent spark */}
          <path
            d="M46 18 l3.8 8.2 L58 30 l-8.2 3.8 L46 42 l-3.8-8.2 L34 30 l8.2-3.8 L46 18 Z"
            fill="currentColor"
            className="text-primary"
            opacity="0.95"
          />
        </svg>
      </div>
    </div>
  );
}

function Chip({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex cursor-default select-none items-center gap-2 rounded-full bg-muted/40 px-3 py-1.5 text-xs text-foreground/80">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="leading-none">{children}</span>
    </div>
  );
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <HumanAgentMark />

      <h1 className="mb-2 text-[26px] sm:text-[34px] font-sans font-semibold tracking-tight text-foreground text-balance" style={{ lineHeight: 1.05 }}>
        Meet your investing partner.
      </h1>

      <p className="mb-4 max-w-[34ch] text-[15px] leading-snug text-muted-foreground text-pretty">
        A rules-first agent that monitors the market 24/7 and executes with discipline.
      </p>

      {/* Trust chips */}
      <div className="mb-5 flex flex-col items-center gap-1.5">
        <p className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/50">
          Guardrails
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Chip icon={SlidersHorizontal}>Under your rules</Chip>
          <Chip icon={ShieldCheck}>Risk guardrails</Chip>
        </div>
      </div>

      <Button
        onClick={onNext}
        className="w-full gap-2 rounded-xl bg-primary py-4 sm:py-5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Start building your strategy
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="mt-2.5 text-xs text-muted-foreground/70">
        Paper trading first. No live execution yet.
      </p>
    </div>
  );
}