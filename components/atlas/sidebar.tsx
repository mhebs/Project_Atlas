"use client"

import {
  Compass,
  MessageSquare,
  ScrollText,
  Wallet,
  UserRound,
} from "lucide-react"
import type { AtlasView } from "./view-types"

const navItems: {
  id: AtlasView
  label: string
  icon: React.ElementType
}[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "strategy", label: "Strategy", icon: ScrollText },
  { id: "portfolio", label: "Portfolio", icon: Wallet },
  { id: "user", label: "User", icon: UserRound },
]

export function Sidebar({
  activeView,
  onNavigate,
  collapsed,
  onToggle,
}: {
  activeView: AtlasView
  onNavigate: (view: AtlasView) => void
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <aside
      className={`hidden lg:flex flex-col bg-sidebar h-screen fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-[280px]"
      }`}
    >
      {collapsed ? (
        <CollapsedContent
          activeView={activeView}
          onNavigate={onNavigate}
          onToggle={onToggle}
        />
      ) : (
        <ExpandedContent
          activeView={activeView}
          onNavigate={onNavigate}
          onToggle={onToggle}
        />
      )}
    </aside>
  )
}

function ExpandedContent({
  activeView,
  onNavigate,
  onToggle,
}: {
  activeView: AtlasView
  onNavigate: (view: AtlasView) => void
  onToggle: () => void
}) {
  return (
    <>
      {/* Atlas Logo */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-8">
        <button
          onClick={onToggle}
          className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center cursor-pointer hover:bg-[#35302a] transition-colors"
        >
          <Compass className="w-5 h-5 text-sidebar-primary" />
        </button>
        <span className="font-serif text-lg tracking-[0.3em] text-sidebar-foreground">
          ATLAS
        </span>
      </div>

      {/* Meridian Agent Card */}
      <div className="px-6 pb-6">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full border-2 border-sidebar-primary/40 flex items-center justify-center">
              <Compass className="w-7 h-7 text-sidebar-primary" />
            </div>
            <span className="absolute bottom-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
          </div>
          <div className="pt-1">
            <p className="text-xl font-medium text-sidebar-foreground">
              Meridian
            </p>
            <p className="text-xs font-mono text-sidebar-muted mt-0.5">
              // Portfolio Intelligence Agent
            </p>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-6 border-t border-sidebar-border" />

      {/* Navigation Header */}
      <div className="px-6 pt-6 pb-5">
        <h3 className="text-[11px] tracking-[0.2em] text-sidebar-primary/70 font-medium uppercase">
          Navigation
        </h3>
      </div>

      {/* Nav Items */}
      <div className="px-6 flex-1">
        <div className="space-y-4">
          {navItems.map((item) => {
            const isActive = activeView === item.id

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-4 w-full cursor-pointer py-1"
              >
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive
                      ? "border-sidebar-primary bg-sidebar-primary"
                      : "border-[#3a3530]"
                  }`}
                >
                  <item.icon
                    className={`w-4.5 h-4.5 ${
                      isActive
                        ? "text-sidebar-primary-foreground"
                        : "text-sidebar-muted"
                    }`}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                </div>
                <span
                  className={`text-[15px] font-medium transition-colors ${
                    isActive
                      ? "text-sidebar-foreground"
                      : "text-sidebar-muted"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4">
        <span className="text-[10px] font-mono text-[#3a3530]">
          v0.1.0-alpha
        </span>
      </div>
    </>
  )
}

function CollapsedContent({
  activeView,
  onNavigate,
  onToggle,
}: {
  activeView: AtlasView
  onNavigate: (view: AtlasView) => void
  onToggle: () => void
}) {
  return (
    <>
      {/* Atlas Icon */}
      <div className="flex justify-center pt-8 pb-4">
        <button
          onClick={onToggle}
          className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center cursor-pointer hover:bg-[#35302a] transition-colors"
        >
          <Compass className="w-5 h-5 text-sidebar-primary" />
        </button>
      </div>

      {/* Separator */}
      <div className="mx-4 border-t border-sidebar-border" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Nav Icons */}
      <div className="flex flex-col items-center gap-4 pb-6">
        {navItems.map((item) => {
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="cursor-pointer"
            >
              {isActive ? (
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-sidebar-accent border border-sidebar-primary/30 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-sidebar-primary" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sidebar-primary" />
                </div>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[#4a4540] hover:text-sidebar-muted transition-colors" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Meridian Icon */}
      <div className="flex justify-center pb-8 pt-4">
        <div className="relative">
          <div className="w-11 h-11 rounded-full border border-sidebar-primary/30 flex items-center justify-center">
            <Compass className="w-5 h-5 text-sidebar-primary" />
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
        </div>
      </div>
    </>
  )
}
