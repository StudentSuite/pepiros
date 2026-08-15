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
 */
export function GuestBanner({ next = "" }: { next?: string }) {
  const href = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-paraphrase/30 bg-paraphrase/10 px-4 py-2.5">
      <Icon icon={TriangleAlert} size="sm" className="shrink-0 text-paraphrase" />
      <p className="font-sans text-xs text-ink">
        <span className="font-medium">You&rsquo;re reading as a guest.</span>{" "}
        <span className="text-ink-muted">
          Papers you add and questions you ask disappear when you close this tab.
        </span>
      </p>
      <Link
        href={href}
        className="ml-auto shrink-0 font-sans text-xs font-medium text-accent underline underline-offset-4 hover:text-accent-hover"
      >
        Sign in to keep them
      </Link>
    </div>
  );
}
