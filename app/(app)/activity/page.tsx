"use client";

import { useState } from "react";
import { sampleActivity } from "@/lib/mock";
import type { ActivityStatus } from "@/lib/types";
import { ActivityCard } from "@/components/activity/activity-card";

type Filter = "All" | ActivityStatus;

const filters: Filter[] = ["All", "Executed", "Monitoring", "Paused"];

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");

  const filtered =
    activeFilter === "All"
      ? sampleActivity
      : sampleActivity.filter((a) => a.status === activeFilter);

  return (
    <div className="flex flex-col gap-5 px-5 pb-28 pt-8">
      <div>
        <h1 className="text-2xl font-serif tracking-tight text-foreground">
          Activity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All agent actions and monitoring events.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              activeFilter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/30"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div className="flex flex-col gap-3">
        {filtered.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity matching this filter.
          </p>
        )}
      </div>
    </div>
  );
}
