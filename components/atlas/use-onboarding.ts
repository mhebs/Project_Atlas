"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { OnboardingPhase } from "./onboarding-types"
import type { StrategyPathId } from "./onboarding/strategy-paths"

const SPLASH_KEY = "atlas:splash_dismissed"
const ONBOARDED_KEY = "atlas:onboarded"
const STRATEGY_DETECTED_KEY = "atlas:strategy_detected"
const STRATEGY_PATH_KEY = "atlas:strategy_path"
const STRATEGY_SEED_KEY = "atlas:strategy_seed"
const STRATEGY_APPROVED_KEY = "atlas:strategy_approved"
const BROKERAGE_CONNECTED_KEY = "atlas:brokerage_connected"
const POLL_INTERVAL_MS = 3000

/* ── Hash-based browser navigation ──────────────────────────── */

const PHASE_ORDER: OnboardingPhase[] = [
  "splash",
  "strategy_creation",
  "chat_onboarding",
  "brokerage_choice",
  "brokerage_connect",
  "strategy_approval",
  "strategy_activated",
  "done",
]

const PHASE_TO_HASH: Record<OnboardingPhase, string> = {
  splash: "#welcome",
  strategy_creation: "#strategy",
  chat_onboarding: "#chat",
  brokerage_choice: "#choose-broker",
  brokerage_connect: "#connect",
  strategy_approval: "#review",
  strategy_activated: "#activated",
  done: "",
}

const HASH_TO_PHASE: Record<string, OnboardingPhase> = {}
for (const [phase, hash] of Object.entries(PHASE_TO_HASH)) {
  if (hash) HASH_TO_PHASE[hash] = phase as OnboardingPhase
}

function phaseIndex(phase: OnboardingPhase): number {
  return PHASE_ORDER.indexOf(phase)
}

/* ── Hook ───────────────────────────────────────────────────── */

interface StrategySummaryCheck {
  confirmed: boolean
  exists: boolean
}

export function useOnboarding() {
  const [phase, setPhaseRaw] = useState<OnboardingPhase>("done")
  const [loading, setLoading] = useState(true)
  const [strategyExists, setStrategyExists] = useState(false)
  const [strategyReady, setStrategyReady] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const farthestRef = useRef(0) // index into PHASE_ORDER

  // Wrapped setPhase that also syncs the URL hash and tracks farthest
  const setPhase = useCallback((next: OnboardingPhase, pushHistory = true) => {
    setPhaseRaw(next)
    const idx = phaseIndex(next)
    if (idx > farthestRef.current) farthestRef.current = idx

    if (typeof window === "undefined") return
    const hash = PHASE_TO_HASH[next]
    if (pushHistory && window.location.hash !== hash) {
      if (hash) {
        window.history.pushState(null, "", hash)
      } else {
        window.history.pushState(null, "", window.location.pathname)
      }
    }
  }, [])

  const checkStrategy = useCallback(async (): Promise<StrategySummaryCheck> => {
    try {
      const res = await fetch("/api/workspace/strategy-summary", { cache: "no-store" })
      if (!res.ok) return { confirmed: false, exists: false }
      const data = await res.json()
      return { confirmed: !!data.confirmed, exists: data.exists }
    } catch {
      return { confirmed: false, exists: false }
    }
  }, [])

  // Derive initial phase on mount
  useEffect(() => {
    mountedRef.current = true

    const init = async () => {
      // Fast path: returning user
      if (localStorage.getItem(ONBOARDED_KEY) === "true") {
        setPhase("done", false)
        setStrategyExists(true)
        setLoading(false)
        return
      }

      const strategy = await checkStrategy()
      if (!mountedRef.current) return

      if (strategy.confirmed) {
        setStrategyExists(true)
        setStrategyReady(true)
        localStorage.setItem(STRATEGY_DETECTED_KEY, "true")
        if (localStorage.getItem(STRATEGY_APPROVED_KEY) === "true") {
          setPhase("strategy_activated", false)
        } else if (localStorage.getItem(BROKERAGE_CONNECTED_KEY) === "true") {
          setPhase("strategy_approval", false)
        } else {
          setPhase("brokerage_choice", false)
        }
      } else if (localStorage.getItem(SPLASH_KEY) === "true") {
        if (localStorage.getItem(STRATEGY_PATH_KEY)) {
          setPhase("chat_onboarding", false)
        } else {
          setPhase("strategy_creation", false)
        }
      } else {
        setPhase("splash", false)
      }

      // Replace (don't push) the initial hash
      const initialPhase = PHASE_ORDER[farthestRef.current] || "splash"
      const hash = PHASE_TO_HASH[initialPhase]
      if (hash && typeof window !== "undefined") {
        window.history.replaceState(null, "", hash)
      }

      setLoading(false)
    }

    void init()
    return () => {
      mountedRef.current = false
    }
  }, [checkStrategy, setPhase])

  // Listen for browser back/forward
  useEffect(() => {
    function handlePopstate() {
      const hash = window.location.hash
      const targetPhase = HASH_TO_PHASE[hash]
      if (!targetPhase) return

      const targetIdx = phaseIndex(targetPhase)
      // Clamp to farthest reached
      if (targetIdx <= farthestRef.current) {
        setPhaseRaw(targetPhase)
      } else {
        // User tried to go beyond farthest — push them back
        const clampedPhase = PHASE_ORDER[farthestRef.current]
        const clampedHash = PHASE_TO_HASH[clampedPhase]
        window.history.replaceState(null, "", clampedHash || window.location.pathname)
        setPhaseRaw(clampedPhase)
      }
    }

    window.addEventListener("popstate", handlePopstate)
    return () => window.removeEventListener("popstate", handlePopstate)
  }, [])

  // Poll during chat_onboarding to detect when agent calls confirm_strategy
  useEffect(() => {
    if (phase !== "chat_onboarding") {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    pollRef.current = setInterval(async () => {
      const strategy = await checkStrategy()
      if (!mountedRef.current) return
      if (strategy.confirmed) {
        setStrategyExists(true)
        // Signal that the strategy is ready but let the user decide when to advance.
        if (localStorage.getItem(STRATEGY_DETECTED_KEY) !== "true") {
          localStorage.setItem(STRATEGY_DETECTED_KEY, "true")
        }
        setStrategyReady(true)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [phase, checkStrategy, setPhase])

  const dismissSplash = useCallback(() => {
    localStorage.setItem(SPLASH_KEY, "true")
    setPhase("strategy_creation")
  }, [setPhase])

  const selectStrategyPath = useCallback((pathId: StrategyPathId, seed?: string) => {
    localStorage.setItem(STRATEGY_PATH_KEY, pathId)
    if (seed) {
      localStorage.setItem(STRATEGY_SEED_KEY, seed)
    } else {
      localStorage.removeItem(STRATEGY_SEED_KEY)
    }
    setPhase("chat_onboarding")
  }, [setPhase])

  const selectBrokerageOption = useCallback(() => {
    setPhase("brokerage_connect")
  }, [setPhase])

  const goBackFromBrokerageChoice = useCallback(() => {
    setPhaseRaw("chat_onboarding")
    if (typeof window !== "undefined") window.history.back()
  }, [])

  const connectBrokerage = useCallback(() => {
    localStorage.setItem(BROKERAGE_CONNECTED_KEY, "true")
    setPhase("strategy_approval")
  }, [setPhase])

  const goBackFromBrokerage = useCallback(() => {
    setPhaseRaw("brokerage_choice")
    if (typeof window !== "undefined") window.history.back()
  }, [])

  const approveStrategy = useCallback(() => {
    localStorage.setItem(STRATEGY_APPROVED_KEY, "true")
    setPhase("strategy_activated")
  }, [setPhase])

  const editStrategy = useCallback(() => {
    setPhaseRaw("chat_onboarding")
    if (typeof window !== "undefined") window.history.back()
  }, [])

  const advanceFromChat = useCallback(() => {
    if (localStorage.getItem(BROKERAGE_CONNECTED_KEY) === "true") {
      setPhase("strategy_approval")
    } else {
      setPhase("brokerage_choice")
    }
  }, [setPhase])

  const goBackToStrategyCreation = useCallback(() => {
    setPhase("strategy_creation")
  }, [setPhase])

  const completeActivation = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, "true")
    localStorage.removeItem(STRATEGY_DETECTED_KEY)
    localStorage.removeItem(STRATEGY_PATH_KEY)
    localStorage.removeItem(STRATEGY_SEED_KEY)
    localStorage.removeItem(STRATEGY_APPROVED_KEY)
    localStorage.removeItem(BROKERAGE_CONNECTED_KEY)
    setPhase("done")
  }, [setPhase])

  return {
    phase,
    loading,
    strategyExists,
    strategyReady,
    dismissSplash,
    selectStrategyPath,
    advanceFromChat,
    goBackToStrategyCreation,
    selectBrokerageOption,
    goBackFromBrokerageChoice,
    connectBrokerage,
    goBackFromBrokerage,
    approveStrategy,
    editStrategy,
    completeActivation,
  }
}
