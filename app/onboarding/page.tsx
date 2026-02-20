"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAtlas } from "@/context/atlas-context";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { PersonalityStep } from "@/components/onboarding/personality-step";
import { RiskStep } from "@/components/onboarding/risk-step";
import { EngagementStep } from "@/components/onboarding/engagement-step";
import { StrategyBiasStep } from "@/components/onboarding/strategy-bias-step";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { activate } = useAtlas();

  const next = () => setStep((s) => s + 1);

  const handleActivate = () => {
    activate();
    router.push("/home");
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        {step > 0 && (
          <div className="mb-8 flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step
                    ? "bg-primary"
                    : "bg-atlas-parchment-dark"
                }`}
              />
            ))}
          </div>
        )}

        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && <PersonalityStep onNext={next} />}
        {step === 2 && <RiskStep onNext={next} />}
        {step === 3 && <EngagementStep onNext={next} />}
        {step === 4 && <StrategyBiasStep onActivate={handleActivate} />}
      </div>
    </main>
  );
}
