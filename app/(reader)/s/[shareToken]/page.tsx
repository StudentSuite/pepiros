import Link from "next/link";
import { resolveShareToken } from "@/lib/services/share";
import { Logo } from "@/components/ui/Logo";
import { Band } from "@/components/chrome/Band";
import { bandButtonClassName } from "@/components/chrome/band-button";
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
    //
    // Issue #309: a real shader Band, not bare text -- one of the few
    // places in this rebuild where that's correct rather than "shader
    // stays a bookend" scope creep, since this is a genuine dead end, not
    // a dense working surface (design/anti-slop.md).
    return (
      <main id="main-content" className="w-full">
        <Band as="div" variant="dark" className="flex min-h-[var(--centered-page-min-h)] w-full items-center justify-center p-s-5">
          <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
            <Link href="/" aria-label="Pepiros home" className="mb-s-6">
              <Logo variant="chrome" />
            </Link>
            <h1 className="font-sans font-bold text-xl text-brand-ink-reversed">
              This link is invalid or has expired
            </h1>
            <p className="mt-s-3 font-sans text-sm text-brand-ink-reversed/70">
              The share link you followed doesn&apos;t resolve to a workspace. Ask whoever sent it for a fresh one.
            </p>
            <Link href="/" className={`${bandButtonClassName("ghost")} mt-s-5`}>
              Go to Pepiros
            </Link>
          </div>
        </Band>
      </main>
    );
  }

  return <ShareClient workspaceId={resolved.workspaceId} />;
}
