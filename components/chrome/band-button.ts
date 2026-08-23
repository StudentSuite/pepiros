import clsx from "clsx";

/**
 * Button styling for a CTA sitting directly on a `<Band>`.
 *
 * Split out of Band.tsx into its own file, deliberately without a "use
 * client" directive, matching components/ui/Button.tsx's buttonClassName.
 * Band.tsx itself is a client component (it calls the useShaderBand hook),
 * and Next.js's "use client" boundary applies to the whole module a
 * directive sits in -- so a pure, hook-free string builder living inside
 * that file became uncallable from a Server Component too, even though
 * nothing about it actually needs the client. Homepage sections that render
 * on the server (app/(marketing)/page.tsx) need this function directly; this
 * file is what lets them have it without pulling in Band's client boundary.
 *
 * The purple rule (app/globals.css) is explicit: "On dark bands, buttons are
 * white pills" -- not the ordinary `--accent` amber Button.tsx renders
 * elsewhere. This intentionally does not extend Button.tsx's variant table:
 * that table is for theme-aware UI chrome, and a band is permanently dark
 * regardless of theme, so it needs the theme-INVARIANT --brand-ink /
 * --brand-ink-reversed tokens instead, the same pair Logo.tsx uses for
 * exactly the same reason.
 */
export function bandButtonClassName(variant: "primary" | "ghost"): string {
  return clsx(
    "inline-flex h-11 items-center justify-center rounded-full px-6 font-sans text-sm font-semibold transition duration-fast ease-out",
    "focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(0,0,0,0.4),0_0_0_5px_var(--brand-ink-reversed)]",
    variant === "primary"
      ? "bg-brand-ink-reversed text-brand-ink hover:opacity-90"
      : "border border-brand-ink-reversed/35 text-brand-ink-reversed hover:bg-brand-ink-reversed/10",
  );
}
