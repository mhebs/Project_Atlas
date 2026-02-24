"use client"

import { MessageSquare, BarChart3, Wallet, Activity } from "lucide-react"

type View = "chat" | "positions" | "balance" | "activity"

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "positions", label: "Positions", icon: BarChart3 },
  { id: "balance", label: "Balance", icon: Wallet },
  { id: "activity", label: "Activity", icon: Activity },
]

export function MobileNav({
  activeView,
  onNavigate,
}: {
  activeView: View
  onNavigate: (view: View) => void
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
