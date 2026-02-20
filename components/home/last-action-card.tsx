"use client";

import Link from "next/link";
import type { ActivityItem } from "@/lib/types";
import { Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LastActionCardProps {
  activity: ActivityItem;
}

export function LastActionCard({ activity }: LastActionCardProps) {
  const time = new Date(activity.timestamp);
  const relative = formatRelative(time);

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Last Action
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {relative}
          </div>
        </div>

        <h3 className="text-base font-medium text-foreground">{activity.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {activity.summary}
        </p>

        <div className="flex flex-wrap gap-2">
          {activity.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        <Link
          href="/activity"
          className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          View all activity
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}
