"use client";

import Link from "next/link";
import type { Mandate } from "@/lib/types";
import { Settings, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MandateCardProps {
  mandate: Mandate;
}

export function MandateCard({ mandate }: MandateCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your Mandate
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            {mandate.coreStrategy} Strategy
          </span>
          {/* Allocation bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {mandate.allocations.map((alloc) => (
              <div
                key={alloc.label}
                className={`h-full transition-all ${
                  alloc.label === "Core"
                    ? "bg-primary"
                    : alloc.label === "Tactical"
                    ? "bg-primary/50"
                    : "bg-atlas-parchment-dark"
                }`}
                style={{ width: `${alloc.pct}%` }}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {mandate.allocations.map((alloc) => (
              <span key={alloc.label} className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    alloc.label === "Core"
                      ? "bg-primary"
                      : alloc.label === "Tactical"
                      ? "bg-primary/50"
                      : "bg-atlas-parchment-dark border border-border"
                  }`}
                />
                {alloc.label} {alloc.pct}%
              </span>
            ))}
          </div>
        </div>

        {/* Guardrails summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary p-3">
            <span className="text-xs text-muted-foreground">Max Drawdown</span>
            <p className="text-sm font-medium text-foreground">
              {mandate.guardrails.maxDrawdownPct}%
            </p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <span className="text-xs text-muted-foreground">Max Position</span>
            <p className="text-sm font-medium text-foreground">
              {mandate.guardrails.maxPositionPct}%
            </p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <span className="text-xs text-muted-foreground">Cash Buffer</span>
            <p className="text-sm font-medium text-foreground">
              {mandate.guardrails.cashBufferPct}%
            </p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <span className="text-xs text-muted-foreground">Rebalance</span>
            <p className="text-sm font-medium text-foreground">
              {mandate.guardrails.rebalanceCadence}
            </p>
          </div>
        </div>

        <Link
          href="/strategy"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Edit mandate
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
