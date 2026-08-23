import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
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
}: {
  kicker?: string;
  title: string;
  dek?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="pb-s-6 pt-s-7">
      {kicker && (
        <p className="mb-s-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          {kicker}
        </p>
      )}
      <h1 className="font-sans font-bold text-[2rem] leading-[1.15] tracking-[-0.01em] text-ink sm:text-[2.6rem]">
        {title}
      </h1>
      {dek && (
        <p className="mt-s-4 font-sans text-lg leading-[1.5] text-ink-muted sm:text-xl">
          {dek}
        </p>
      )}
      {children && <div className="mt-s-5">{children}</div>}
    </header>
  );
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
        "font-sans text-[1.0625rem] leading-[1.75] text-ink-muted",
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
