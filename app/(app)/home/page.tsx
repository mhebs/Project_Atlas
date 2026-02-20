"use client";

import { useAtlas } from "@/context/atlas-context";
import { agentStatus, sampleActivity, seededDialogue } from "@/lib/mock";
import { StatusHeader } from "@/components/home/status-header";
import { LastActionCard } from "@/components/home/last-action-card";
import { MandateCard } from "@/components/home/mandate-card";
import { DialoguePreviewCard } from "@/components/home/dialogue-preview-card";

export default function HomePage() {
  const { state } = useAtlas();

  const lastActivity = sampleActivity[0];
  const latestAgentMessage = seededDialogue.filter((m) => m.role === "agent").at(-1);

  return (
    <div className="flex flex-col gap-5 px-5 pb-28 pt-8">
      <StatusHeader
        agentName={state.agentName}
        monitoringCount={agentStatus.monitoringCount}
      />
      <LastActionCard activity={lastActivity} />
      <MandateCard mandate={state.mandate} />
      {latestAgentMessage && (
        <DialoguePreviewCard message={latestAgentMessage} />
      )}
    </div>
  );
}
