"use client";

import { useState, useCallback } from "react";
import { useAtlas } from "@/context/atlas-context";
import type { Allocation, RebalanceCadence } from "@/lib/types";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const cadenceOptions: RebalanceCadence[] = ["Weekly", "Monthly", "Quarterly"];

export default function StrategyPage() {
  const { state, updateMandate } = useAtlas();
  const [allocations, setAllocations] = useState<Allocation[]>(
    state.mandate.allocations
  );
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(
    state.mandate.guardrails.maxDrawdownPct
  );
  const [maxPositionPct, setMaxPositionPct] = useState(
    state.mandate.guardrails.maxPositionPct
  );
  const [rebalanceCadence, setRebalanceCadence] = useState<RebalanceCadence>(
    state.mandate.guardrails.rebalanceCadence
  );
  const [saved, setSaved] = useState(false);

  const updateAllocation = useCallback(
    (label: "Core" | "Tactical" | "Cash", value: number) => {
      setAllocations((prev) => {
        const updated = prev.map((a) => (a.label === label ? { ...a, pct: value } : a));
        const total = updated.reduce((sum, a) => sum + a.pct, 0);
        const diff = total - 100;
        if (diff !== 0) {
          // Distribute the difference to Cash
          const cashIdx = updated.findIndex((a) => a.label === "Cash");
          if (cashIdx >= 0 && label !== "Cash") {
            updated[cashIdx] = {
              ...updated[cashIdx],
              pct: Math.max(0, Math.min(100, updated[cashIdx].pct - diff)),
            };
          }
        }
        return updated;
      });
      setSaved(false);
    },
    []
  );

  const handleSave = () => {
    updateMandate({
      allocations,
      guardrails: {
        maxDrawdownPct,
        cashBufferPct: allocations.find((a) => a.label === "Cash")?.pct || 20,
        maxPositionPct,
        rebalanceCadence,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const autonomySummary =
    state.engagement === "Just execute my strategy"
      ? "Atlas has full autonomy to execute within your guardrails."
      : state.engagement === "Notify me before major reallocations"
      ? "Atlas will notify you before making major reallocations."
      : "Atlas will ask for your approval before every trade.";

  return (
    <div className="flex flex-col gap-5 px-5 pb-28 pt-8">
      <div>
        <h1 className="text-2xl font-serif tracking-tight text-foreground">
          Strategy & Mandate
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.mandate.coreStrategy} strategy. Adjust allocations and guardrails.
        </p>
      </div>

      {/* Allocations */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col gap-5 p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Allocations
          </span>

          {allocations.map((alloc) => (
            <div key={alloc.label} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {alloc.label}
                </span>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {alloc.pct}%
                </span>
              </div>
              <Slider
                value={[alloc.pct]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) =>
                  updateAllocation(alloc.label, v)
                }
                className="w-full"
              />
            </div>
          ))}

          {/* Total indicator */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Total</span>
            <span
              className={`text-sm font-medium tabular-nums ${
                allocations.reduce((s, a) => s + a.pct, 0) === 100
                  ? "text-primary"
                  : "text-destructive"
              }`}
            >
              {allocations.reduce((s, a) => s + a.pct, 0)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Guardrails */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col gap-5 p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Guardrails
          </span>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Max Drawdown</span>
              <span className="text-sm font-medium tabular-nums text-foreground">
                {maxDrawdownPct}%
              </span>
            </div>
            <Slider
              value={[maxDrawdownPct]}
              min={5}
              max={30}
              step={1}
              onValueChange={([v]) => {
                setMaxDrawdownPct(v);
                setSaved(false);
              }}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Max Position Size</span>
              <span className="text-sm font-medium tabular-nums text-foreground">
                {maxPositionPct}%
              </span>
            </div>
            <Slider
              value={[maxPositionPct]}
              min={2}
              max={20}
              step={1}
              onValueChange={([v]) => {
                setMaxPositionPct(v);
                setSaved(false);
              }}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              Rebalance Cadence
            </span>
            <div className="flex gap-2">
              {cadenceOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setRebalanceCadence(c);
                    setSaved(false);
                  }}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                    rebalanceCadence === c
                      ? "border-primary bg-atlas-green-light/50 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autonomy */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col gap-2 p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Autonomy Level
          </span>
          <p className="text-sm leading-relaxed text-foreground">
            {autonomySummary}
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        className="w-full gap-2 rounded-xl bg-primary py-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : (
          "Save mandate"
        )}
      </Button>
    </div>
  );
}
