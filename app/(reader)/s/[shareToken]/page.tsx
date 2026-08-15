import { resolveShareToken } from "@/lib/services/share";
import { ShareClient } from "./ShareClient";

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const resolved = resolveShareToken(shareToken);

  if (!resolved) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-xl text-ink">This link is invalid or has expired</h1>
        <p className="mt-s-3 font-sans text-sm text-ink-muted">
          The share link you followed doesn&apos;t resolve to a workspace. Ask whoever sent it for a fresh one.
        </p>
      </main>
    );
  }

  return <ShareClient shareToken={shareToken} workspaceId={resolved.workspaceId} />;
}
