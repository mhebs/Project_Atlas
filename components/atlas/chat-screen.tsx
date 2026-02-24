"use client"

import { useState } from "react"
import { Send } from "lucide-react"

const quickReplies = [
  "Long-term growth",
  "Income-focused",
  "Active rotation",
  "Not sure yet",
]

interface Message {
  role: "agent" | "user"
  content: string
}

const initialMessages: Message[] = [
  {
    role: "agent",
    content:
      "Welcome to Atlas. I'm Meridian, your portfolio intelligence agent. Before I execute anything, I need to understand how you define risk.",
  },
  {
    role: "user",
    content:
      "I want steady growth but I don't want to lose more than 15% in a downturn.",
  },
  {
    role: "agent",
    content:
      "Understood. A 15% max drawdown is a clear guardrail. I'll structure allocations around long-duration growth equities with defensive hedging. Shall I draft a strategy summary for your approval?",
  },
]

function StrategyCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-6">
      <h3 className="font-serif text-sm text-muted-foreground mb-3 tracking-wide uppercase">
        Current Strategy
      </h3>
      <div className="grid grid-cols-2 gap-y-3 gap-x-6">
        <div>
          <p className="text-xs text-muted-foreground">Style</p>
          <p className="text-sm font-medium text-foreground">Long-Term Growth</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Risk Cap</p>
          <p className="text-sm font-medium text-foreground">15% max drawdown</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Capital Allocated</p>
          <p className="text-sm font-mono text-foreground">$25,000</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-secondary font-medium">Draft</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: Message }) {
  const isAgent = message.role === "agent"
  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"} mb-4`}>
      <div
        className={`max-w-[80%] lg:max-w-[65%] ${
          isAgent
            ? "bg-card border border-border rounded-lg rounded-tl-none"
            : "bg-primary text-primary-foreground rounded-lg rounded-tr-none"
        } px-4 py-3`}
      >
        {isAgent && (
          <p className="text-xs font-mono text-muted-foreground mb-1.5">
            Meridian
          </p>
        )}
        <p className={`text-sm leading-relaxed ${isAgent ? "font-serif text-foreground" : ""}`}>
          {message.content}
        </p>
      </div>
    </div>
  )
}

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [showChips, setShowChips] = useState(true)

  const handleSend = () => {
    if (!input.trim()) return
    setMessages((prev) => [...prev, { role: "user", content: input.trim() }])
    setInput("")
    setShowChips(false)
    // Simulate agent response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content:
            "I've noted your input. Let me analyze this against the current market conditions and draft an updated strategy framework.",
        },
      ])
    }, 1200)
  }

  const handleChip = (chip: string) => {
    setMessages((prev) => [...prev, { role: "user", content: chip }])
    setShowChips(false)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: `I'll build a strategy around a ${chip.toLowerCase()} approach. Let me define the allocation parameters and risk guardrails for your review.`,
        },
      ])
    }, 1200)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="font-serif text-2xl text-foreground text-balance">
          Define Your Strategy
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          I will execute what we agree to.
        </p>
      </div>

      {/* Strategy Card */}
      <div className="px-6">
        <StrategyCard />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}

        {/* Quick reply chips */}
        {showChips && (
          <div className="flex flex-wrap gap-2 mt-2 mb-4">
            {quickReplies.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                className="px-3 py-1.5 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer bg-card"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex items-end gap-3 bg-card border border-border rounded-lg p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Describe how you want to invest."
            rows={2}
            className="flex-1 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/60 text-foreground leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30 cursor-pointer"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
