"use client";

import Link from "next/link";
import type { DialogueMessage } from "@/lib/types";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DialoguePreviewCardProps {
  message: DialogueMessage;
}

export function DialoguePreviewCard({ message }: DialoguePreviewCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Live Agent Dialogue
          </span>
        </div>

        <p className="text-sm leading-relaxed text-foreground line-clamp-3">
          {message.content}
        </p>

        {message.constraints && (
          <div className="flex flex-wrap gap-1.5">
            {message.constraints.map((c) => (
              <span
                key={c}
                className="rounded-md bg-atlas-green-light px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <Link
          href="/dialogue"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Open dialogue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
