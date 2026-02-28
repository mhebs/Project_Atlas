"use client"

import { Cable, MessageSquare, ScrollText, Wallet, UserRound } from "lucide-react"
import type { AtlasView } from "./view-types"

const navItems: { id: AtlasView; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "strategy", label: "Strategy", icon: ScrollText },
  { id: "portfolio", label: "Portfolio", icon: Wallet },
  { id: "accounts", label: "Accounts", icon: Cable },
  { id: "user", label: "User", icon: UserRound },
]

export function MobileNav({
  activeView,
  onNavigate,
}: {
  activeView: AtlasView
  onNavigate: (view: AtlasView) => void
}) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <ul className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-secondary" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
