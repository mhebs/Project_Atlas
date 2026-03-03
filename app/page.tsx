"use client"

import { useState } from "react"
import { Sidebar } from "@/components/atlas/sidebar"
import { MobileNav } from "@/components/atlas/mobile-nav"
import { ChatScreen } from "@/components/atlas/chat-screen"
import { StrategyScreen } from "@/components/atlas/strategy-screen"
import { PortfolioScreen } from "@/components/atlas/portfolio-screen"
import { ActivityScreen } from "@/components/atlas/activity-screen"
import { AccountsScreen } from "@/components/atlas/accounts-screen"
import { UserScreen } from "@/components/atlas/user-screen"
import { SplashOverlay } from "@/components/atlas/splash-overlay"
import { StrategyActivatedOverlay } from "@/components/atlas/strategy-activated-overlay"
import { useOnboarding } from "@/components/atlas/use-onboarding"
import type { AtlasView } from "@/components/atlas/view-types"

const ONBOARDING_LOCKED_VIEWS: AtlasView[] = ["strategy", "portfolio", "activity", "accounts"]

const AUTO_TRIGGER_MESSAGE =
  "I just opened Atlas for the first time. Help me define my investment strategy."

export default function Home() {
  const [activeView, setActiveView] = useState<AtlasView>("chat")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { phase, loading, dismissSplash, completeActivation } = useOnboarding()

  const isOnboarding = phase === "chat_onboarding" || phase === "splash"
  const lockedViews = isOnboarding ? ONBOARDING_LOCKED_VIEWS : undefined

  // Force chat view during onboarding
  const effectiveView = isOnboarding ? "chat" : activeView
  const handleNavigate = (view: AtlasView) => {
    if (lockedViews?.includes(view)) return
    setActiveView(view)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#060606]" />
  }

  return (
    <div className="min-h-screen bg-background">
      {phase === "splash" && <SplashOverlay onDismiss={dismissSplash} />}
      {phase === "strategy_activated" && (
        <StrategyActivatedOverlay onComplete={completeActivation} />
      )}

      <Sidebar
        activeView={effectiveView}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        lockedViews={lockedViews}
      />
      <MobileNav
        activeView={effectiveView}
        onNavigate={handleNavigate}
        lockedViews={lockedViews}
      />

      <main
        className={`h-screen pb-16 lg:pb-0 transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[280px]"
        }`}
      >
        <div className="h-full transition-opacity duration-200">
          {effectiveView === "chat" && (
            <ChatScreen
              autoTriggerMessage={phase === "chat_onboarding" ? AUTO_TRIGGER_MESSAGE : undefined}
            />
          )}
          {effectiveView === "strategy" && <StrategyScreen />}
          {effectiveView === "portfolio" && <PortfolioScreen />}
          {effectiveView === "activity" && <ActivityScreen />}
          {effectiveView === "accounts" && <AccountsScreen />}
          {effectiveView === "user" && <UserScreen />}
        </div>
      </main>
    </div>
  )
}
