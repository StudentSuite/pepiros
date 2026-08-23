import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { Band } from "@/components/chrome/Band";
import { cn } from "@/lib/utils";

/**
 * Long-form reading primitives, built for a publishing surface, not app chrome.
 *
 * The whole system is one narrow measure, generous vertical rhythm, and almost
 * no chrome. Three rules do most of the work:
 *
 *   1. ONE MEASURE. Body text sits at ~68ch and never widens, regardless of
 *      viewport. Long lines are the single biggest thing that makes a reading
 *      surface feel like an app instead of a publication.
 *   2. DIVIDERS, NOT BOXES. Structure comes from hairlines and space. Cards
 *      make every element look equally important, which is the opposite of
 *      what an article wants.
 *   3. METADATA RECEDES. Author, date and stats are small and muted so the
 *      title and body own the page.
 */

/** The reading measure. Everything long-form is centred in this. */
export function ReadingColumn({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-s-5",
        wide ? "max-w-3xl" : "max-w-[42rem]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Title, standfirst, and the byline row beneath. */
export function ArticleHeader({
  kicker,
  title,
  dek,
  children,
  /**
   * A slim shader strip behind kicker+title+dek (a header-height band, not
   * the full-bleed hero treatment -- see design/anti-slop.md on why the
   * shader stays a bookend). Off by default:
   * this component is also used on dense working surfaces (paper detail)
   * that want no shader at all, so the band is opt-in per caller rather
   * than baked into every header on the site.
   *
   * FIXED 2026-08-23 (StudentSuite/pepiros#317): Band's own background
   * never actually changes between variant="light" and variant="dark" --
   * both render the same dark mesh-drift gradient plus the same 62%-opacity
   * dark scrim (see Band.tsx). `variant` only ever controlled whether the
   * WRAPPING element got `text-brand-ink-reversed`, and this content sets
   * `text-ink`/`text-ink-muted` directly on its own h1/p, which wins over
   * whatever color class an ancestor carries -- so the "light" variant's
   * text was falling through to its normal light-theme dark ink, on a band
   * background that is always dark. Confirmed live: rgb(27,24,18) title
   * text on the purple band in light theme, essentially invisible.
   * Banded now always renders light text, since the band it sits on is
   * never actually a light surface regardless of which variant is passed.
   */
  banded = false,
}: {
  kicker?: string;
  title: string;
  dek?: string;
  children?: React.ReactNode;
  banded?: boolean;
}) {
  const content = (
    <>
      {kicker && (
        <p
          className={cn(
            "mb-s-3 font-mono text-[11px] uppercase tracking-[0.14em]",
            banded ? "text-brand-ink-reversed/60" : "text-ink-faint",
          )}
        >
          {kicker}
        </p>
      )}
      <h1
        className={cn(
          "font-sans font-bold text-[2rem] leading-[1.15] tracking-[-0.01em] sm:text-[2.6rem]",
          banded ? "text-brand-ink-reversed" : "text-ink",
        )}
      >
        {title}
      </h1>
      {dek && (
        <p
          className={cn(
            "mt-s-4 font-sans text-lg leading-[1.5] sm:text-xl",
            banded ? "text-brand-ink-reversed/70" : "text-ink-muted",
          )}
        >
          {dek}
        </p>
      )}
      {children && <div className="mt-s-5">{children}</div>}
    </>
  );

  if (banded) {
    return (
      <Band as="header" variant="dark" className="px-6 py-s-7">
        <div className="mx-auto w-full max-w-[42rem]">{content}</div>
      </Band>
    );
  }

  return <header className="pb-s-6 pt-s-7">{content}</header>;
}

/** Avatar, name, and a muted metadata line. */
export function Byline({
  name,
  href,
  initials,
  meta,
  action,
}: {
  name: string;
  href?: string;
  initials: string;
  meta: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-s-3 border-y border-border py-s-4">
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-subtle font-mono text-[11px] text-ink-muted">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            className="block truncate font-sans text-sm font-medium text-ink hover:text-accent-text"
          >
            {name}
          </Link>
        ) : (
          <p className="truncate font-sans text-sm font-medium text-ink">{name}</p>
        )}
        <p className="truncate font-sans text-[13px] text-ink-faint">{meta}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Body copy.
 *
 * Typography is set here once rather than per-page, so every article on the
 * site shares a measure, a leading, and a heading scale. 18px at 1.75 is the
 * comfortable end of long-form on screen.
 */
export function ArticleBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Long-form reading prose, not UI chrome: Source Serif 4, per
        // design/anti-slop.md's font-role rule (serif for reading body,
        // Geist for headings and UI). Headings below stay font-sans
        // deliberately -- they step down from the title, not the prose.
        "font-serif text-[1.0625rem] leading-[1.75] text-ink-muted",
        "[&>*+*]:mt-s-5",
        "[&_p]:text-[1.0625rem] [&_p]:leading-[1.75]",
        "[&_strong]:font-medium [&_strong]:text-ink",
        "[&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-2",
        // headings step down from the title rather than restarting the scale
        "[&_h2]:mt-s-7 [&_h2]:font-sans [&_h2]:font-semibold [&_h2]:text-[1.45rem] [&_h2]:leading-snug [&_h2]:text-ink",
        "[&_h3]:mt-s-6 [&_h3]:font-sans [&_h3]:font-semibold [&_h3]:text-[1.15rem] [&_h3]:leading-snug [&_h3]:text-ink",
        "[&_ul]:flex [&_ul]:flex-col [&_ul]:gap-s-2 [&_ul]:pl-5",
        "[&_li]:list-disc [&_li]:marker:text-ink-faint",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-s-4 [&_blockquote]:font-serif [&_blockquote]:italic",
        "[&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A quiet full-width rule, used between article sections. */
export function ArticleRule({ className }: { className?: string }) {
  return <hr className={cn("my-s-7 border-border", className)} />;
}

/**
 * One entry in a feed.
 *
 * Title-led, with the standfirst underneath and metadata below that. The
 * optional right-hand slot holds a thumbnail or a grounding stat, sized so the
 * text column keeps a usable measure even when it is present.
 */
export function FeedItem({
  href,
  title,
  dek,
  meta,
  aside,
  tags,
}: {
  href: string;
  title: string;
  dek?: string;
  meta: React.ReactNode;
  aside?: React.ReactNode;
  tags?: React.ReactNode;
}) {
  return (
    <article className="border-b border-border py-s-6 first:pt-0">
      <div className="flex gap-s-5">
        <div className="min-w-0 flex-1">
          {tags && <div className="mb-s-2 flex flex-wrap gap-s-2">{tags}</div>}
          <h2 className="font-sans font-semibold text-xl leading-snug tracking-[-0.005em] text-ink">
            <Link href={href} className="hover:text-accent-text">
              {title}
            </Link>
          </h2>
          {dek && (
            <p className="mt-s-2 line-clamp-2 font-sans text-[15px] leading-relaxed text-ink-muted">
              {dek}
            </p>
          )}
          <div className="mt-s-3 flex flex-wrap items-center gap-x-s-3 gap-y-1 font-sans text-[13px] text-ink-faint">
            {meta}
          </div>
        </div>
        {aside && <div className="hidden shrink-0 sm:block">{aside}</div>}
      </div>
    </article>
  );
}

/** Metadata separator, so the dot spacing is identical everywhere. */
export function Dot() {
  return <span aria-hidden className="text-ink-faint/60">·</span>;
}
