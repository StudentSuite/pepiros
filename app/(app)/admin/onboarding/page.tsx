import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { isAdminProfile } from "@/lib/auth/admin";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { OnboardingTable } from "./OnboardingTable";

export const metadata: Metadata = { title: "Onboarding responses" };

/**
 * `/admin/onboarding` (issue #234).
 *
 * Onboarding answers were write-only: getOnboarding() reads one profile's
 * row, there was no aggregate read, no admin role and no admin route, and
 * /analytics is scoped to the signed-in profile rather than global. So users
 * answered questions nobody could ever look at.
 *
 * NOT FOUND, NOT FORBIDDEN, for a non-admin. A 403 confirms the route exists,
 * which tells anyone probing that there is an admin surface here worth
 * attacking. 404 is what a route that is none of your business should look
 * like. middleware.ts guarantees a session before this renders; the admin
 * check is here rather than in middleware because middleware does no database
 * round trip by design.
 *
 * Read access is deliberately a hand-set boolean in the SQL editor with no
 * role-management UI: a screen that grants admin is a far larger security
 * surface than a column nothing in the app can write.
 */
export default async function AdminOnboardingPage() {
  const session = await getSession();
  if (!session) notFound();

  const adapter = getAdapter();
  const profile = await adapter.getProfile(session.id);
  if (!isAdminProfile(profile)) notFound();

  const responses = await adapter.listOnboardingResponses();

  return (
    <div className="mx-auto w-full max-w-6xl p-s-5">
      <PageHeader
        title="Onboarding responses"
        description="What people said when they signed up, including free-text answers."
      />

      {responses.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No responses yet"
          description="Answers appear here once somebody completes onboarding."
        />
      ) : (
        <OnboardingTable responses={responses} />
      )}
    </div>
  );
}
