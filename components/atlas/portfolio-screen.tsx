"use client"

import { WorkspaceDocScreen } from "./workspace-doc-screen"

export function PortfolioScreen() {
  return (
    <WorkspaceDocScreen
      fileName="PORTFOLIO.md"
      title="Portfolio"
      subtitle="Live view of the agent-managed portfolio state from workspace markdown."
    />
  )
}

