import { ReaderClient } from "./ReaderClient";

// Default doc-reader landing surface (plan.md §1) -- NOT the canvas. Server
// wrapper just awaits the async route param and hands off to the client
// component that owns the store subscription.
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <ReaderClient workspaceId={workspaceId} />;
}
