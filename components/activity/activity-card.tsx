"use client";

import { useState } from "react";
import type { ActivityItem } from "@/lib/types";
import { ChevronDown, Clock, CheckCircle2, Eye, Pause } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ActivityCardProps {
  activity: ActivityItem;
}

const statusConfig = {
  Executed: {
    icon: CheckCircle2,
    color: "bg-primary text-primary-foreground",
    badge: "bg-atlas-green-light text-primary",
  },
  Monitoring: {
    icon: Eye,
    color: "bg-chart-4/20 text-chart-4",
    badge: "bg-chart-4/10 text-chart-3",
  },
  Paused: {
    icon: Pause,
    color: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const [open, setOpen] = useState(false);
  const config = statusConfig[activity.status];
  const StatusIcon = config.icon;

  const time = new Date(activity.timestamp);
  const dateStr = time.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.color}`}
            >
              <StatusIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-medium text-foreground leading-snug">
                {activity.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {dateStr} at {timeStr}
              </div>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${config.badge}`}
          >
            {activity.status}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {activity.summary}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {activity.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Reasoning accordion */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          aria-expanded={open}
        >
          Why this action?
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="rounded-xl bg-atlas-parchment-dark p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Atlas reasoning:</p>
            <p className="text-sm leading-relaxed text-foreground italic">
              {activity.reasoning}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
