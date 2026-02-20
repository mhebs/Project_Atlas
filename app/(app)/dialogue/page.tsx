"use client";

import { useState, useRef, useEffect } from "react";
import { seededDialogue } from "@/lib/mock";
import type { DialogueMessage } from "@/lib/types";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatBubble } from "@/components/dialogue/chat-bubble";

const agentResponses = [
  "I understand your concern. Let me review the current allocations against your mandate and get back to you with a detailed analysis.",
  "That's a prudent question. Based on the current market conditions and your risk parameters, I'd recommend holding steady for now. Here's why: your drawdown buffer is healthy and we're within all guardrail limits.",
  "Good timing on that question. I've been monitoring this sector closely. The fundamentals remain strong despite short-term volatility, and our position sizing is well within the 8% limit you set.",
  "I appreciate the input. I'll factor this into the tactical allocation decisions. Your mandate parameters remain my primary guide.",
];

export default function DialoguePage() {
  const [messages, setMessages] = useState<DialogueMessage[]>(seededDialogue);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: DialogueMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate agent response after a short delay
    setTimeout(() => {
      const agentMsg: DialogueMessage = {
        id: `msg-${Date.now()}-agent`,
        role: "agent",
        content: agentResponses[Math.floor(Math.random() * agentResponses.length)],
        timestamp: new Date().toISOString(),
        constraints: ["Drawdown OK", "Cash buffer OK", "Position sizing OK"],
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 1200);
  };

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-sm font-bold text-primary-foreground font-serif">A</span>
          </div>
          <div>
            <h1 className="text-base font-medium text-foreground">Atlas</h1>
            <p className="text-xs text-muted-foreground">
              Your autonomous investing agent
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Atlas anything..."
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            type="submit"
            disabled={!input.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
