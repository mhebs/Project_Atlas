export type StrategyPathId = "build" | "preset" | "ai-design"

export interface PresetStrategy {
  id: string
  name: string
  shortDescription: string
  seedPrompt: string
}

export interface StrategyPath {
  id: StrategyPathId
  stepNumber: string
  title: string
  description: string
  badge?: string
  previewPresets?: PresetStrategy[]
  moreCount?: number
}

export const AI_DESIGN_SEED =
  "I need help defining my investment strategy. Can you help?"

export const PRESET_STRATEGIES: PresetStrategy[] = [
  {
    id: "pelosi",
    name: "Pelosi Trade",
    shortDescription: "Congressional trading signals",
    seedPrompt:
      "I want to mirror my portfolio continuously with Nancy Pelosi's public holdings by monitoring for filings and rebalancing accordingly.",
  },
  {
    id: "carlson",
    name: "Carlson Story Fund",
    shortDescription: "Narrative-driven allocation",
    seedPrompt:
      "I want a strategy that allocates to companies driving the most compelling narratives in the market right now — momentum based on story, not just fundamentals.",
  },
  {
    id: "ai-portfolio",
    name: "AI Portfolio",
    shortDescription: "AI & compute leaders",
    seedPrompt:
      "I want a concentrated portfolio of the leading AI and compute companies — chip makers, cloud infrastructure, and frontier model developers.",
  },
  {
    id: "dividend-compounder",
    name: "Dividend Compounder",
    shortDescription: "Reinvested dividend growth",
    seedPrompt:
      "I want a dividend growth strategy focused on companies that consistently raise dividends, with all distributions reinvested automatically.",
  },
  {
    id: "bogle-core",
    name: "Bogle Core",
    shortDescription: "Total market index tracking",
    seedPrompt:
      "I want a simple three-fund portfolio — total US stock market, international, and bonds — rebalanced quarterly to target allocations.",
  },
  {
    id: "sector-rotation",
    name: "Sector Rotation",
    shortDescription: "Business cycle momentum",
    seedPrompt:
      "I want a sector rotation strategy that shifts allocations based on where we are in the business cycle — overweight sectors with momentum, underweight laggards.",
  },
  {
    id: "small-cap-value",
    name: "Small Cap Value",
    shortDescription: "Undervalued small companies",
    seedPrompt:
      "I want a small-cap value strategy targeting undervalued companies with strong balance sheets and low price-to-book ratios.",
  },
  {
    id: "esg-impact",
    name: "ESG Impact",
    shortDescription: "Sustainable investing",
    seedPrompt:
      "I want a portfolio that prioritizes companies with strong environmental, social, and governance scores while excluding fossil fuels and controversial weapons.",
  },
]

export const STRATEGY_PATHS: StrategyPath[] = [
  {
    id: "build",
    stepNumber: "01",
    title: "Build your strategy",
    description:
      "Describe your investment thesis in your own words. Atlas will structure it into an executable strategy.",
  },
  {
    id: "preset",
    stepNumber: "02",
    title: "Choose a preset strategy",
    description: "Start from a proven template and customize it to your needs.",
    badge: "Most popular",
    previewPresets: PRESET_STRATEGIES.slice(0, 3),
    moreCount: PRESET_STRATEGIES.length - 3,
  },
  {
    id: "ai-design",
    stepNumber: "03",
    title: "Let AI design one",
    description:
      "Answer a few questions and Atlas will build a strategy tailored to your goals and risk tolerance.",
    badge: "Recommended for new investors",
  },
]
