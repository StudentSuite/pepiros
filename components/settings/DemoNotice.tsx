import { Info } from "lucide-react";

/**
 * Shown on settings surfaces when signed in as the shared demo account.
 *
 * Says why controls are inert rather than leaving someone to discover it by
 * pressing Save and getting nothing. Deliberately an inline note, not a
 * dismissible banner: it is a fact about the account, not a notification.
 */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <div
      className={`mb-s-6 flex gap-s-3 rounded-md border border-border bg-subtle/60 p-s-4 ${className ?? ""}`}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-ink-faint" strokeWidth={1.5} />
      <p className="min-w-0 font-sans text-[13px] leading-relaxed text-ink-muted">
        You are signed in as the shared demo account. You can look around
        everywhere, but changes are not saved and destructive actions are hidden,
        since everyone who tries Pepiros lands in this same account.
      </p>
    </div>
  );
}
