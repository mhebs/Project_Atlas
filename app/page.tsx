"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/atlas/sidebar"
import { MobileNav } from "@/components/atlas/mobile-nav"
import { ChatScreen } from "@/components/atlas/chat-screen"
import { ChatScreenV2 } from "@/components/atlas/chat-screen-v2"
import { StrategyScreen } from "@/components/atlas/strategy-screen"
import { PortfolioScreen } from "@/components/atlas/portfolio-screen"
import { ActivityScreen } from "@/components/atlas/activity-screen"
import { AccountsScreen } from "@/components/atlas/accounts-screen"
import { UserScreen } from "@/components/atlas/user-screen"
import { SplashOverlay } from "@/components/atlas/splash-overlay"
import { StrategyActivatedOverlay } from "@/components/atlas/strategy-activated-overlay"
import { StrategyCreationOverlay, BrokerageChoiceOverlay, BrokerageConnectOverlay, StrategyApprovalOverlay } from "@/components/atlas/onboarding"
import { useOnboarding } from "@/components/atlas/use-onboarding"
import type { AtlasView } from "@/components/atlas/view-types"

const USE_AI_SDK_CHAT = process.env.NEXT_PUBLIC_USE_AI_SDK_CHAT === "true"

export default function Home() {
  const [activeView, setActiveView] = useState<AtlasView>("chat")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [justActivated, setJustActivated] = useState(false)
  const { phase, loading, strategyReady, dismissSplash, selectStrategyPath, advanceFromChat, goBackToStrategyCreation, selectBrokerageOption, goBackFromBrokerageChoice, connectBrokerage, goBackFromBrokerage, approveStrategy, editStrategy, completeActivation } = useOnboarding()

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
      {/* Solid backdrop prevents chat bleed-through during overlay transitions */}
      {phase !== "done" && phase !== "chat_onboarding" && (
        <div className="fixed inset-0 z-40 bg-ob-parchment" aria-hidden="true" />
      )}

      {phase === "splash" && <SplashOverlay onDismiss={dismissSplash} />}
      {phase === "strategy_creation" && (
        <StrategyCreationOverlay onSelectPath={selectStrategyPath} />
      )}
      {phase === "brokerage_choice" && (
        <BrokerageChoiceOverlay onChooseExisting={selectBrokerageOption} onBack={goBackFromBrokerageChoice} />
      )}
      {phase === "brokerage_connect" && (
        <BrokerageConnectOverlay onConnect={connectBrokerage} onBack={goBackFromBrokerage} />
      )}
      {phase === "strategy_approval" && (
        <StrategyApprovalOverlay onApprove={approveStrategy} onEdit={editStrategy} />
      )}
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
          {activeView === "chat" && phase !== "splash" && phase !== "strategy_creation" && (
            USE_AI_SDK_CHAT
              ? <ChatScreenV2 isOnboarding={isOnboarding} strategyReady={strategyReady} onAdvance={advanceFromChat} onGoBack={goBackToStrategyCreation} />
              : <ChatScreen isOnboarding={isOnboarding} strategyReady={strategyReady} onAdvance={advanceFromChat} onGoBack={goBackToStrategyCreation} />
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
