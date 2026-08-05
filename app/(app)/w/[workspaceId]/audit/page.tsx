import { AuditClient } from "./AuditClient";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <AuditClient workspaceId={workspaceId} />;
}
