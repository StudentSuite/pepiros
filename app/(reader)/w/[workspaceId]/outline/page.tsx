import { getSession } from "@/lib/auth/session";
import { GuestBanner } from "@/components/auth/GuestBanner";
import { OutlineClient } from "./OutlineClient";

// Guests can read: middleware.ts deliberately leaves /w open, same as the
// main reader page.tsx -- this subpage used to render no banner at all
// (issue #90), so a guest who tapped into Outline lost the one piece of UI
// telling them their session isn't saved.
export default async function OutlinePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await getSession();

  return (
    <>
      {!session && <GuestBanner next={`/w/${workspaceId}/outline`} />}
      <OutlineClient workspaceId={workspaceId} />
    </>
  );
}
