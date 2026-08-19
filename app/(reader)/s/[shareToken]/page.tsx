import Link from "next/link";
import { resolveShareToken } from "@/lib/services/share";
import { Logo } from "@/components/ui/Logo";
import { buttonClassName } from "@/components/ui/Button";
import { ShareClient } from "./ShareClient";

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const resolved = resolveShareToken(shareToken);

  if (!resolved) {
    // Issue #89: a stale/typo'd share link is arguably the single most
    // likely dead-end a stranger with zero context hits -- this used to
    // have no way off the page at all besides the browser back button.
    return (
      <main id="main-content" className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center p-s-5 text-center">
        <Link href="/" aria-label="Pepiros home" className="mb-s-6">
          <Logo />
        </Link>
        <h1 className="font-serif text-xl text-ink">This link is invalid or has expired</h1>
        <p className="mt-s-3 font-sans text-sm text-ink-muted">
          The share link you followed doesn&apos;t resolve to a workspace. Ask whoever sent it for a fresh one.
        </p>
        <Link href="/" className={buttonClassName("secondary", "md", "mt-s-5")}>
          Go to Pepiros
        </Link>
      </main>
    );
  }

  return <ShareClient shareToken={shareToken} workspaceId={resolved.workspaceId} />;
}
