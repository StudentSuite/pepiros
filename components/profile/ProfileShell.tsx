import Link from "next/link";
import clsx from "clsx";
import { LogoMark } from "@/components/ui/Logo";

/**
 * Shared GitHub-shaped profile chrome: a left identity rail and a top tab bar,
 * with the tab's own content rendered beside it.
 *
 * Used by both /open (the catalog, which has no owner) and /u/[username] (a
 * person). The two differ only in what they pass in, which is why `avatar`,
 * `action` and `tabs` are all injected rather than branched on internally.
 *
 * Tabs are real routes rather than client state, matching GitHub: a tab is
 * linkable, back works, and each one can fetch only its own data.
 */

export interface ProfileTab {
  href: string;
  label: string;
  /** Rendered as GitHub renders its counters, muted in a pill beside the label. */
  count?: number;
}

export interface ProfileMetaItem {
  icon: React.ReactNode;
  /** Plain text, or a link when `href` is set. */
  label: string;
  href?: string;
}

export interface ProfileShellProps {
  name: string;
  handle: string;
  bio?: string;
  /** Falls back to the Pepiros glyph, which is what an ownerless profile uses. */
  avatar?: React.ReactNode;
  /** GitHub's Follow slot. Omitted entirely when there is nobody to follow. */
  action?: React.ReactNode;
  /** Location, email, external links. Rendered under the identity block. */
  meta?: ProfileMetaItem[];
  tabs: ProfileTab[];
  /** Pathname of the active tab, matched against each tab's href. */
  activeHref: string;
  children: React.ReactNode;
}

export function ProfileShell({
  name,
  handle,
  bio,
  avatar,
  action,
  meta,
  tabs,
  activeHref,
  children,
}: ProfileShellProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-s-4 sm:px-s-5">
      <nav
        aria-label="Profile sections"
        className="-mx-s-4 overflow-x-auto border-b border-border px-s-4 sm:-mx-s-5 sm:px-s-5"
      >
        <ul className="flex min-w-max gap-s-1">
          {tabs.map((tab) => {
            const active = tab.href === activeHref;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "inline-flex items-center gap-s-2 border-b-2 px-s-3 py-s-3 font-sans text-sm transition-colors duration-fast ease-out",
                    active
                      ? "border-accent font-medium text-ink"
                      : "border-transparent text-ink-muted hover:border-border-strong hover:text-ink"
                  )}
                >
                  {tab.label}
                  {typeof tab.count === "number" && (
                    <span className="rounded-full bg-surface-sunken px-s-2 py-[1px] font-mono text-[0.6875rem] text-ink-muted">
                      {tab.count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-s-6 py-s-6 lg:flex-row lg:gap-s-7">
        <aside className="shrink-0 lg:w-64">
          <div className="flex items-center gap-s-4 lg:block">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-raised lg:h-40 lg:w-40">
              {avatar ?? <LogoMark className="h-8 w-8 lg:h-20 lg:w-20" />}
            </div>
            <div className="min-w-0 lg:mt-s-4">
              <h1 className="truncate font-sans text-xl font-semibold text-ink lg:text-2xl">
                {name}
              </h1>
              <p className="truncate font-mono text-sm text-ink-muted">{handle}</p>
            </div>
          </div>

          {bio && (
            <p className="mt-s-4 font-sans text-sm leading-relaxed text-ink-muted">
              {bio}
            </p>
          )}

          {action && <div className="mt-s-4">{action}</div>}

          {meta && meta.length > 0 && (
            <ul className="mt-s-4 space-y-s-2">
              {meta.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-s-2 font-sans text-sm text-ink-muted"
                >
                  <span className="shrink-0 text-ink-faint" aria-hidden>
                    {item.icon}
                  </span>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="truncate transition-colors duration-fast ease-out hover:text-accent"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
