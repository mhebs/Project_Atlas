"use client";

interface StatusHeaderProps {
  agentName: string;
  monitoringCount: number;
}

export function StatusHeader({ agentName, monitoringCount }: StatusHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </div>
        <h1 className="text-2xl font-serif tracking-tight text-foreground">
          {agentName} is live
        </h1>
      </div>
      <p className="pl-5 text-sm text-muted-foreground">
        Monitoring {monitoringCount} assets
      </p>
    </div>
  );
}
