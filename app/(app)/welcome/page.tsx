"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { pillarColor } from "@/components/ui/PillarChip";

const TOTAL_STEPS = 3;

/**
 * `/welcome` -- 3-step onboarding, `app/(app)/` authenticated-only, no
 * shared layout so this rolls its own minimal chrome (same pattern as
 * `/upload`, `/login`). Step state is local `useState` only: there is no
 * per-step route or query param, so a step can only be reached by clicking
 * "Continue" on the one before it -- reload lands back on step 1, and
 * there's no URL to skip ahead to. Step 3's primary action routes to the
 * seeded demo workspace (`ws-1`, `fixtures/workspace.json`) since there's
 * no real workspace-creation backend (Global Constraints).
 */
export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("My workspace");

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="surface-reading paper-grain w-full max-w-md rounded-lg p-s-6">
        <Logo variant="paper" />

        <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-[#1c1a15]/60">
          Step {step} of {TOTAL_STEPS}
        </p>

        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((dot) => (
            <span
              key={dot}
              className="h-1.5 flex-1 rounded-full transition-colors duration-base ease-out"
              style={{
                backgroundColor: dot <= step ? pillarColor(dot) : "rgba(28,26,21,0.15)",
              }}
            />
          ))}
        </div>

        <div className="mt-6 [&_.text-ink-muted]:!text-[#4a4740] [&_.text-ink-faint]:!text-[#4a4740]">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h1 className="font-serif text-2xl text-[#1c1a15]">Welcome to Pepiros</h1>
              <p className="font-sans text-sm text-[#1c1a15]/80">
                Pepiros reads your papers alongside you and builds a citation graph where every
                claim links back to the exact quote it came from.
              </p>
              <Button variant="primary" className="mt-2 w-full" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h1 className="font-serif text-2xl text-[#1c1a15]">Name your first workspace</h1>
              <p className="font-sans text-sm text-[#1c1a15]/80">
                A workspace groups the papers you&apos;re reading together. You can rename this
                later.
              </p>
              <FormField label="Workspace name">
                <Input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="My workspace"
                />
              </FormField>
              <Button variant="primary" className="mt-2 w-full" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <h1 className="font-serif text-2xl text-[#1c1a15]">You&apos;re ready</h1>
              <p className="font-sans text-sm text-[#1c1a15]/80">
                &ldquo;{workspaceName || "My workspace"}&rdquo; is set up. We&apos;ll drop you into
                a demo workspace with a few papers already loaded so you can see how the graph
                works.
              </p>
              <Button variant="primary" className="mt-2 w-full" onClick={() => router.push("/w/ws-1")}>
                Open workspace
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
