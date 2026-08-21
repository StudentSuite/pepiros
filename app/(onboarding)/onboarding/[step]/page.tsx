import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { OnboardingResponse } from "@/lib/data/types";
import { saveOnboardingAction } from "@/app/(app)/actions";

export const metadata: Metadata = { title: "Set up your account" };

const STEP_COUNT = 7;

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const { step: raw } = await params;
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > STEP_COUNT) notFound();

  const existing = await getAdapter().getOnboarding(profile.id);
  const initial: OnboardingResponse = existing ?? {
    profileId: profile.id,
    country: null,
    referralSource: null,
    referralOther: null,
    role: null,
    fields: [],
    intent: null,
    experience: null,
    agentTools: [],
    completedAt: null,
  };

  return (
    // The wizard reads `next` off the query string (issue #256) to return the
    // visitor to wherever they were headed before signing up, and
    // useSearchParams needs a boundary or the whole route bails out of static
    // rendering.
    <Suspense fallback={null}>
      <OnboardingWizard
        step={step}
        initial={initial}
        onComplete={async (response) => {
          "use server";
          await saveOnboardingAction(response);
        }}
      />
    </Suspense>
  );
}
