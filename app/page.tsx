"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtlas } from "@/context/atlas-context";

export default function RootPage() {
  const router = useRouter();
  const { state } = useAtlas();

  useEffect(() => {
    if (state.isActivated) {
      router.replace("/home");
    } else {
      router.replace("/onboarding");
    }
  }, [state.isActivated, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <span className="text-xl font-bold text-primary-foreground font-serif">A</span>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </main>
  );
}
