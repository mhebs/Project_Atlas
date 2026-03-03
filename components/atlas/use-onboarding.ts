"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { OnboardingPhase } from "./onboarding-types"
import { isPlaceholderContent } from "./onboarding-types"

const SPLASH_KEY = "atlas:splash_dismissed"
const ONBOARDED_KEY = "atlas:onboarded"
const STRATEGY_DETECTED_KEY = "atlas:strategy_detected"
const POLL_INTERVAL_MS = 3000

interface StrategySummaryCheck {
  exists: boolean
  rawContent?: string
  mtimeMs?: number | null
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
      if (!res.ok) return { exists: false }
      const data = await res.json()
      const hasReal = !isPlaceholderContent(data.rawContent)
      return { exists: hasReal, rawContent: data.rawContent, mtimeMs: data.mtimeMs ?? null }
    } catch {
      return { exists: false }
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

      if (strategy.exists) {
        setStrategyExists(true)
        // Strategy exists but user hasn't completed onboarding.
        // Show strategy review overlay so they can activate.
        if (localStorage.getItem(STRATEGY_DETECTED_KEY) === "true") {
          // Returning to strategy review after refresh
          setPhase("strategy_activated")
        } else {
          // Strategy was already there on first load (e.g. pre-existing)
          // Still show the review screen
          localStorage.setItem(STRATEGY_DETECTED_KEY, "true")
          setPhase("strategy_activated")
        }
      } else if (localStorage.getItem(SPLASH_KEY) === "true") {
        setPhase("chat_onboarding")
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

  // Poll during chat_onboarding to detect when agent writes STRATEGY.md
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
      if (strategy.exists) {
        setStrategyExists(true)
        localStorage.setItem(STRATEGY_DETECTED_KEY, "true")
        setPhase("strategy_activated")
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
    setPhase("chat_onboarding")
  }, [])

  const completeActivation = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, "true")
    localStorage.removeItem(STRATEGY_DETECTED_KEY)
    setPhase("done")
  }, [])

  return { phase, loading, dismissSplash, completeActivation, strategyExists }
}
