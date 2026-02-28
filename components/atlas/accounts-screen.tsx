"use client"

import { WorkspaceDocScreen } from "./workspace-doc-screen"

export function AccountsScreen() {
  return (
    <WorkspaceDocScreen
      fileName="ACCOUNTS.md"
      title="Connected Accounts"
      subtitle="Broker connections and account status managed by the agent."
    />
  )
}
