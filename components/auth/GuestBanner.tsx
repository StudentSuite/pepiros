import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

/**
 * Shown on surfaces a guest can use but not keep.
 *
 * The wording is deliberately concrete about *what* is lost and *when*.
 * "Sign in to save your work" reads as an upsell and gets ignored; naming
 * the actual consequence is the only version a reader can act on before it
 * costs them something. It links rather than blocks: the whole point of
 * guest mode is that the app is usable without an account.
 *
 * Issue #319: "papers you add... disappear when you close this tab" used to
 * cover both papers and questions. Real ingest is durably backed by
 * Postgres now (lib/services/ingestStore.ts, issue #47) -- an uploaded
 * paper survives the tab closing, it just has nowhere of its own to live
 * yet (app/(platform)/upload/UploadForm.tsx has no per-account workspace to
 * write into, so every upload -- guest or signed-in -- lands in the one
 * shared demo workspace; see the roadmap's own "no create-a-workspace UI
 * route" entry). Chat questions are the one half of the old claim still
 * true: ChatDock's messages are plain React state POST to /api/chat, never
 * written anywhere server-side.
 */
export function GuestBanner({ next = "" }: { next?: string }) {
  const href = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div
      // The reader's Sidebar is `fixed inset-y-0 left-0 z-10` (shadcn's
      // sidebar primitive), so it overlaps the top-left of the page
      // regardless of this banner's DOM position. Without its own stacking
      // context above that z-index, the sidebar painted over the banner's
      // left edge, clipping its opening words.
      className="relative z-20 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-paraphrase/30 bg-paraphrase/10 px-4 py-2.5"
    >
      <Icon icon={TriangleAlert} size="sm" className="shrink-0 text-paraphrase" />
      <p className="font-sans text-xs text-ink">
        <span className="font-medium">You&rsquo;re reading as a guest.</span>{" "}
        <span className="text-ink-muted">
          Questions you ask disappear when you close this tab. A paper you add is
          saved to the shared demo workspace, not to an account of your own.
        </span>
      </p>
      <Link
        href={href}
        className="ml-auto shrink-0 font-sans text-xs font-medium text-accent underline underline-offset-4 hover:text-accent-hover"
      >
        {/* "Sign in to keep them" used to sit here, promising per-account
            persistence sign-in doesn't actually deliver yet (upload has no
            per-account workspace to write into, and chat is never
            persisted regardless of session -- see the doc comment above). */}
        Sign in for your own account
      </Link>
    </div>
  );
}
