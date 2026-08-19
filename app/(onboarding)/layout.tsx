/**
 * Issue #135: onboarding used to inherit app/(app)/layout.tsx's full
 * AppSidebar (Home/Workspaces/Discover/Posts/Analytics/Comments/Settings) --
 * a brand-new user mid-setup could click away to any page and abandon the
 * wizard entirely, and since no AppSidebar href matches `/onboarding/*`,
 * isActive() lit up nothing, so there was no "where am I" cue either. Moved
 * to its own route group (same technique app/(reader)/* already uses to
 * escape this same shell -- route groups don't appear in the URL, so
 * /onboarding/1 etc. are unchanged) with no sidebar at all: a focused
 * wizard/funnel shouldn't offer a way to wander off mid-setup.
 *
 * No auth check here -- app/(onboarding)/onboarding/[step]/page.tsx already
 * redirects to /login when signed out, same belt-and-braces layering
 * app/(app)/layout.tsx's own doc comment describes (middleware.ts is the
 * real enforcement either way).
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-surface">{children}</div>;
}
