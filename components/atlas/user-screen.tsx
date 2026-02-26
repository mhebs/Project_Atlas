"use client"

import { WorkspaceDocScreen } from "./workspace-doc-screen"

export function UserScreen() {
  return (
    <WorkspaceDocScreen
      fileName="USER.md"
      title="User Profile"
      subtitle="Open-ended user context captured by the agent in workspace markdown."
    />
  )
}

