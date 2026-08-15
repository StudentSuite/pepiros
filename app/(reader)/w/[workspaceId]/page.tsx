import { getSession } from "@/lib/auth/session";
import { GuestBanner } from "@/components/auth/GuestBanner";
import { ReaderClient } from "./ReaderClient";

// Default doc-reader landing surface (plan.md §1) -- NOT the canvas. Server
// wrapper awaits the async route param and hands off to the client component
// that owns the store subscription.
//
// Guests can read: middleware.ts deliberately leaves /w open. The banner is
// what keeps that honest, so nobody discovers the work was disposable only
// after doing some.
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await getSession();

  return (
    <>
      {!session && <GuestBanner next={`/w/${workspaceId}`} />}
      <ReaderClient workspaceId={workspaceId} />
    </>
  );
}
