"use client"

import { useEffect, useState } from "react"
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

export default function Home() {
  const [activeView, setActiveView] = useState<AtlasView>("chat")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [justActivated, setJustActivated] = useState(false)
  const { phase, loading, dismissSplash, completeActivation } = useOnboarding()

  const isOnboarding = phase !== "done"

  const handleActivate = () => {
    setJustActivated(true)
    completeActivation()
  }

  // Clear justActivated after animation completes
  useEffect(() => {
    if (!justActivated) return
    const timer = setTimeout(() => setJustActivated(false), 500)
    return () => clearTimeout(timer)
  }, [justActivated])

  const handleNavigate = (view: AtlasView) => {
    setActiveView(view)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#060606]" />
  }

  return (
    <div className="min-h-screen bg-background">
      {phase === "splash" && <SplashOverlay onDismiss={dismissSplash} />}
      {phase === "strategy_activated" && (
        <StrategyActivatedOverlay onComplete={handleActivate} />
      )}

      {!isOnboarding && (
        <>
          <Sidebar
            activeView={activeView}
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            animate={justActivated}
          />
          <MobileNav
            activeView={activeView}
            onNavigate={handleNavigate}
          />
        </>
      )}

      <main
        className={`h-screen transition-[margin] duration-300 ease-in-out ${
          isOnboarding
            ? ""
            : `pb-16 lg:pb-0 ${sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[280px]"}`
        }`}
      >
        <div className="h-full transition-opacity duration-200">
          {activeView === "chat" && (
            <ChatScreen isOnboarding={isOnboarding} />
          )}
          {activeView === "strategy" && <StrategyScreen />}
          {activeView === "portfolio" && <PortfolioScreen />}
          {activeView === "activity" && <ActivityScreen />}
          {activeView === "accounts" && <AccountsScreen />}
          {activeView === "user" && <UserScreen />}
        </div>
      </main>
    </div>
  )
}
