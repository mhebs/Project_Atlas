"use client";

import type { DialogueMessage } from "@/lib/types";

interface ChatBubbleProps {
  message: DialogueMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isAgent = message.role === "agent";
  const time = new Date(message.timestamp);
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-col gap-1.5 ${isAgent ? "items-start" : "items-end"}`}>
      {isAgent && (
        <span className="text-[11px] font-medium text-muted-foreground">Atlas</span>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isAgent
            ? "rounded-tl-md bg-card border border-border"
            : "rounded-tr-md bg-primary text-primary-foreground"
        }`}
      >
        <p className={`text-sm leading-relaxed ${isAgent ? "text-foreground" : "text-primary-foreground"}`}>
          {message.content}
        </p>
      </div>

      {/* Constraint chips for agent messages */}
      {isAgent && message.constraints && (
        <div className="flex flex-wrap gap-1">
          {message.constraints.map((c) => (
            <span
              key={c}
              className="rounded-md bg-atlas-green-light px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <span className="text-[10px] text-muted-foreground/60">{timeStr}</span>
    </div>
  );
}
