export type OnboardingPhase = "splash" | "chat_onboarding" | "strategy_activated" | "done"

const MIN_STRATEGY_LENGTH = 400

const REQUIRED_SECTION_PATTERNS = [
  /(^|\n)\s*(?:#{1,6}\s*)?overview\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?(goal|objective)\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?(approach|methodology)\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?(target portfolio|portfolio targets?|portfolio)\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?entry rules?\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?exit rules?\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?safety limits?\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?(rebalance|rebalancing) plan\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?exclusions?\b/i,
  /(^|\n)\s*(?:#{1,6}\s*)?notes?\b/i,
]

function hasLikelyCutoffTail(content: string): boolean {
  const trimmed = content.trim()
  return (
    /(?:will populate|to be (?:added|completed|filled)|coming soon)\s*$/i.test(trimmed) ||
    /\b(?:tbd|todo)\s*$/i.test(trimmed)
  )
}

function hasCompleteStrategyStructure(content: string): boolean {
  if (content.trim().length < MIN_STRATEGY_LENGTH) return false

  const matchedSections = REQUIRED_SECTION_PATTERNS.reduce((count, pattern) => {
    return count + (pattern.test(content) ? 1 : 0)
  }, 0)

  const hasAllocationTable =
    /\|\s*symbol\s*\|/i.test(content) &&
    /\|\s*(allocation|weight)\s*\|/i.test(content)
  const hasAllocationText = /(allocation|weight|target)\s*[:|-]/i.test(content)
  const hasTickerAllocations = /\b[A-Z]{1,5}\b[\s|:-]{1,8}\d{1,3}%/.test(content)
  const hasPortfolioSignal = hasAllocationTable || hasAllocationText || hasTickerAllocations

  const hasRiskControls =
    /(^|\n)\s*(?:#{1,6}\s*)?entry rules?\b/i.test(content) &&
    /(^|\n)\s*(?:#{1,6}\s*)?exit rules?\b/i.test(content) &&
    /(^|\n)\s*(?:#{1,6}\s*)?safety limits?\b/i.test(content)

  const hasRebalancePlan = /(^|\n)\s*(?:#{1,6}\s*)?(rebalance|rebalancing) plan\b/i.test(content)
  const hasExclusions = /(^|\n)\s*(?:#{1,6}\s*)?exclusions?\b/i.test(content)

  return (
    matchedSections >= 8 &&
    hasPortfolioSignal &&
    hasRiskControls &&
    hasRebalancePlan &&
    hasExclusions &&
    !hasLikelyCutoffTail(content)
  )
}

/**
 * Mirrors the backend's isPlaceholder() from packages/agent/src/prompt-assembler.ts.
 * Returns true when STRATEGY.md contains no real user content.
 */
export function isPlaceholderContent(content?: string | null): boolean {
  if (!content) return true
  const lower = content.toLowerCase()

  if (
    lower.includes("not yet configured") ||
    lower.includes("awaiting user input") ||
    lower.includes("placeholder")
  ) {
    return true
  }

  return !hasCompleteStrategyStructure(content)
}
