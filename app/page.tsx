"use client"

import { useState } from "react"
import { Sidebar } from "@/components/atlas/sidebar"
import { MobileNav } from "@/components/atlas/mobile-nav"
import { ChatScreen } from "@/components/atlas/chat-screen"
import { PositionsScreen } from "@/components/atlas/positions-screen"
import { BalanceScreen } from "@/components/atlas/balance-screen"
import { ActivityScreen } from "@/components/atlas/activity-screen"

type View = "chat" | "positions" | "balance" | "activity"

export default function Home() {
  const [activeView, setActiveView] = useState<View>("chat")

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <MobileNav activeView={activeView} onNavigate={setActiveView} />

      <main className="lg:ml-[260px] h-screen pb-16 lg:pb-0">
        <div className="h-full transition-opacity duration-200">
          {activeView === "chat" && <ChatScreen />}
          {activeView === "positions" && <PositionsScreen />}
          {activeView === "balance" && <BalanceScreen />}
          {activeView === "activity" && <ActivityScreen />}
        </div>
      </main>
    </div>
  )
}
