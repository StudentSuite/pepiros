import { OutlineClient } from "./OutlineClient";

export default async function OutlinePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <OutlineClient workspaceId={workspaceId} />;
}
