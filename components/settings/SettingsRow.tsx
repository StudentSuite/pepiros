import { cn } from "@/lib/utils";

/**
 * One setting: label and explanation on the left, control on the right.
 *
 * Deliberately hairline-divided rows in a single wide column rather than a
 * stack of bordered cards. The card-per-setting version read as cluttered
 * because every row carried its own border, shadow and padding, so nothing was
 * visually subordinate to anything else and the eye had no path down the page.
 *
 * Here the divider is the only chrome, the label column is fixed so every
 * control lines up on a single axis, and the whole thing collapses to stacked
 * blocks below sm where a two-column split would crush both sides.
 */
export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
  align = "center",
  className,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children?: React.ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  const Label = htmlFor ? "label" : "div";
  return (
    <div
      className={cn(
        "grid gap-s-3 border-b border-border py-s-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] sm:gap-s-6",
        align === "center" ? "sm:items-center" : "sm:items-start",
        className,
      )}
    >
      <div className="min-w-0">
        <Label
          htmlFor={htmlFor}
          className="block font-sans text-sm font-medium text-ink"
        >
          {label}
        </Label>
        {description && (
          <p className="mt-1 max-w-prose font-sans text-[13px] leading-relaxed text-ink-faint">
            {description}
          </p>
        )}
      </div>
      {children && <div className="min-w-0">{children}</div>}
    </div>
  );
}

/**
 * A titled group of rows. `title` is optional: the first group on a page
 * usually needs no heading because the page title already said it.
 */
export function SettingsGroup({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-border pt-s-6", className)}>
      {title && (
        <div className="mb-s-2">
          <h2 className="font-serif text-lg text-ink">{title}</h2>
          {description && (
            <p className="mt-1 max-w-prose font-sans text-[13px] leading-relaxed text-ink-faint">
              {description}
            </p>
          )}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
