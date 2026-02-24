"use client"

import { MessageSquare, BarChart3, Wallet, Activity } from "lucide-react"

type View = "chat" | "positions" | "balance" | "activity"

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "positions", label: "Positions", icon: BarChart3 },
  { id: "balance", label: "Balance", icon: Wallet },
  { id: "activity", label: "Activity", icon: Activity },
]

export function Sidebar({
  activeView,
  onNavigate,
}: {
  activeView: View
  onNavigate: (view: View) => void
}) {
  return (
    <aside className="hidden lg:flex flex-col w-[260px] bg-sidebar text-sidebar-foreground h-screen fixed left-0 top-0 border-r border-sidebar-border">
      {/* Wordmark */}
      <div className="px-6 pt-8 pb-6">
        <h1 className="font-serif text-xl tracking-wide text-sidebar-foreground">
          ATLAS
        </h1>
      </div>

      {/* Meridian Agent Card */}
      <div className="px-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="font-serif text-sm text-secondary">M</span>
          </div>
          <div>
            <p className="text-sm font-medium text-sidebar-foreground">Meridian</p>
            <p className="text-xs text-sidebar-foreground/60">
              Portfolio Intelligence Agent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pl-12">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3d6b4f]" />
          <span className="text-xs text-sidebar-foreground/50 font-mono">
            Monitoring markets
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-secondary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sidebar-border">
        <span className="text-xs font-mono text-sidebar-foreground/40">
          v0.1.0-alpha
        </span>
      </div>
    </aside>
  )
}
