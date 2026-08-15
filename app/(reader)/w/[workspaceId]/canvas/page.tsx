import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GraphCanvas } from "@/components/canvas/GraphCanvas";
import { getSession } from "@/lib/auth/session";
import { GuestBanner } from "@/components/auth/GuestBanner";

/**
 * Standalone canvas route (plan.md: reached via the reader view's "Explore graph"
 * toggle, but must also work when navigated to directly, e.g. /w/ws-1/canvas).
 * React Flow requires an explicitly sized parent, so the canvas takes the
 * remaining height under the bar rather than `h-dvh` on the whole page.
 *
 * The bar exists because this route has no layout of its own: previously the
 * canvas filled the viewport with no title and no way back, so the only exit
 * was the browser's back button -- and a reader who arrived by link had none.
 */
export default async function CanvasPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await getSession();

  return (
    <div className="flex h-dvh w-full flex-col bg-surface">
      {!session && <GuestBanner next={`/w/${workspaceId}/canvas`} />}

      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
        <Link
          href={`/w/${workspaceId}`}
          className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-muted transition-colors duration-fast ease-out hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to reader
        </Link>
        <span className="text-border-strong" aria-hidden>
          /
        </span>
        <h1 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Graph
        </h1>
      </header>

      <div className="relative min-h-0 flex-1">
        <GraphCanvas workspaceId={workspaceId} />
      </div>
    </div>
  );
}
