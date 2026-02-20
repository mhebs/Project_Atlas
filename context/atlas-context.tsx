"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  AppState,
  Personality,
  RiskResponse,
  RiskFollowUp,
  Engagement,
  StrategyBias,
  Mandate,
} from "@/lib/types";

const defaultMandate: Mandate = {
  coreStrategy: "Blended",
  allocations: [
    { label: "Core", pct: 60 },
    { label: "Tactical", pct: 20 },
    { label: "Cash", pct: 20 },
  ],
  guardrails: {
    maxDrawdownPct: 12,
    cashBufferPct: 20,
    maxPositionPct: 8,
    rebalanceCadence: "Monthly",
  },
};

const defaultState: AppState = {
  agentName: "Atlas",
  personality: null,
  riskResponse: null,
  riskFollowUp: null,
  engagement: null,
  strategyBias: null,
  isActivated: false,
  mandate: defaultMandate,
};

interface AtlasContextValue {
  state: AppState;
  setPersonality: (p: Personality) => void;
  setRiskResponse: (r: RiskResponse) => void;
  setRiskFollowUp: (f: RiskFollowUp) => void;
  setEngagement: (e: Engagement) => void;
  setStrategyBias: (s: StrategyBias) => void;
  activate: () => void;
  updateMandate: (m: Partial<Mandate>) => void;
}

const AtlasContext = createContext<AtlasContextValue | null>(null);

export function AtlasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);

  const setPersonality = useCallback((p: Personality) => {
    setState((prev) => ({ ...prev, personality: p }));
  }, []);

  const setRiskResponse = useCallback((r: RiskResponse) => {
    setState((prev) => ({ ...prev, riskResponse: r, riskFollowUp: null }));
  }, []);

  const setRiskFollowUp = useCallback((f: RiskFollowUp) => {
    setState((prev) => ({ ...prev, riskFollowUp: f }));
  }, []);

  const setEngagement = useCallback((e: Engagement) => {
    setState((prev) => ({ ...prev, engagement: e }));
  }, []);

  const setStrategyBias = useCallback((s: StrategyBias) => {
    setState((prev) => ({ ...prev, strategyBias: s }));
  }, []);

  const activate = useCallback(() => {
    setState((prev) => {
      let coreStrategy = prev.mandate.coreStrategy;
      if (prev.strategyBias === "Buy strong companies and hold")
        coreStrategy = "Quality Hold";
      else if (prev.strategyBias === "Trade structured setups")
        coreStrategy = "Trend Following";
      else if (prev.strategyBias === "Follow macro trends")
        coreStrategy = "Macro Tilt";
      else coreStrategy = "Blended";

      return {
        ...prev,
        isActivated: true,
        mandate: { ...prev.mandate, coreStrategy },
      };
    });
  }, []);

  const updateMandate = useCallback((m: Partial<Mandate>) => {
    setState((prev) => ({
      ...prev,
      mandate: {
        ...prev.mandate,
        ...m,
        guardrails: {
          ...prev.mandate.guardrails,
          ...(m.guardrails || {}),
        },
        allocations: m.allocations || prev.mandate.allocations,
      },
    }));
  }, []);

  return (
    <AtlasContext.Provider
      value={{
        state,
        setPersonality,
        setRiskResponse,
        setRiskFollowUp,
        setEngagement,
        setStrategyBias,
        activate,
        updateMandate,
      }}
    >
      {children}
    </AtlasContext.Provider>
  );
}

export function useAtlas() {
  const ctx = useContext(AtlasContext);
  if (!ctx) throw new Error("useAtlas must be used within AtlasProvider");
  return ctx;
}
