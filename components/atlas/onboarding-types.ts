export type OnboardingPhase = "splash" | "chat_onboarding" | "strategy_activated" | "done"

/**
 * Mirrors the backend's isPlaceholder() from packages/agent/src/prompt-assembler.ts:128.
 * Returns true when STRATEGY.md contains no real user content.
 */
export function isPlaceholderContent(content?: string | null): boolean {
  if (!content) return true
  const lower = content.toLowerCase()
  return (
    lower.includes("not yet configured") ||
    lower.includes("awaiting user input") ||
    lower.includes("placeholder") ||
    content.trim().length < 50
  )
}
