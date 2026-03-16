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
const POLL_INTERVAL_MS = 3000

interface StrategySummaryCheck {
  confirmed: boolean
  exists: boolean
}

export function useOnboarding() {
  const [phase, setPhase] = useState<OnboardingPhase>("done")
  const [loading, setLoading] = useState(true)
  const [strategyExists, setStrategyExists] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

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
        setPhase("done")
        setStrategyExists(true)
        setLoading(false)
        return
      }

      const strategy = await checkStrategy()
      if (!mountedRef.current) return

      if (strategy.confirmed) {
        setStrategyExists(true)
        localStorage.setItem(STRATEGY_DETECTED_KEY, "true")
        if (localStorage.getItem(STRATEGY_APPROVED_KEY) === "true") {
          setPhase("strategy_activated")
        } else {
          setPhase("strategy_approval")
        }
      } else if (localStorage.getItem(SPLASH_KEY) === "true") {
        // Splash dismissed — check if strategy path was chosen
        if (localStorage.getItem(STRATEGY_PATH_KEY)) {
          setPhase("chat_onboarding")
        } else {
          setPhase("strategy_creation")
        }
      } else {
        setPhase("splash")
      }

      setLoading(false)
    }

    void init()
    return () => {
      mountedRef.current = false
    }
  }, [checkStrategy])

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
        localStorage.setItem(STRATEGY_DETECTED_KEY, "true")
        setPhase("strategy_approval")
      }
    }, POLL_INTERVAL_MS)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [phase, checkStrategy])

  const dismissSplash = useCallback(() => {
    localStorage.setItem(SPLASH_KEY, "true")
    setPhase("strategy_creation")
  }, [])

  const selectStrategyPath = useCallback((pathId: StrategyPathId, seed?: string) => {
    localStorage.setItem(STRATEGY_PATH_KEY, pathId)
    if (seed) {
      localStorage.setItem(STRATEGY_SEED_KEY, seed)
    } else {
      localStorage.removeItem(STRATEGY_SEED_KEY)
    }
    setPhase("chat_onboarding")
  }, [])

  const approveStrategy = useCallback(() => {
    localStorage.setItem(STRATEGY_APPROVED_KEY, "true")
    setPhase("strategy_activated")
  }, [])

  const editStrategy = useCallback(() => {
    setPhase("chat_onboarding")
  }, [])

  const completeActivation = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, "true")
    localStorage.removeItem(STRATEGY_DETECTED_KEY)
    localStorage.removeItem(STRATEGY_PATH_KEY)
    localStorage.removeItem(STRATEGY_SEED_KEY)
    localStorage.removeItem(STRATEGY_APPROVED_KEY)
    setPhase("done")
  }, [])

  return { phase, loading, dismissSplash, selectStrategyPath, approveStrategy, editStrategy, completeActivation, strategyExists }
}
