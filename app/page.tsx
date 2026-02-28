"use client"

import { useState } from "react"
import { Sidebar } from "@/components/atlas/sidebar"
import { MobileNav } from "@/components/atlas/mobile-nav"
import { ChatScreen } from "@/components/atlas/chat-screen"
import { StrategyScreen } from "@/components/atlas/strategy-screen"
import { PortfolioScreen } from "@/components/atlas/portfolio-screen"
import { AccountsScreen } from "@/components/atlas/accounts-screen"
import { UserScreen } from "@/components/atlas/user-screen"
import type { AtlasView } from "@/components/atlas/view-types"

export default function Home() {
  const [activeView, setActiveView] = useState<AtlasView>("chat")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <MobileNav activeView={activeView} onNavigate={setActiveView} />

      <main
        className={`h-screen pb-16 lg:pb-0 transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[280px]"
        }`}
      >
        <div className="h-full transition-opacity duration-200">
          {activeView === "chat" && <ChatScreen />}
          {activeView === "strategy" && <StrategyScreen />}
          {activeView === "portfolio" && <PortfolioScreen />}
          {activeView === "accounts" && <AccountsScreen />}
          {activeView === "user" && <UserScreen />}
        </div>
      </main>
    </div>
  )
}
