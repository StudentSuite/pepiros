import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getSession } from "@/lib/auth/session";

/**
 * Marketing route group: content pages (`/about`, `/how-it-works`, `/mcp`,
 * etc.) that still share the site's auth-aware header. Issue #88: this used
 * to render SiteHeader with no session prop at all, falling back to a
 * hardcoded signed-out mock -- a signed-in user saw "Sign in / Sign up" on
 * every one of these pages regardless of their real session.
 */
export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <>
      <SiteHeader session={session} />
      {/* bg-surface here, not left to each page. Every page in this group can
          render a <Band> (hero/CTA on the homepage, PageHeaderBand on the 8
          legal-frame pages), and Band reveals ShaderCanvas's shared fixed
          canvas by going transparent -- if whatever sits next to a Band is
          ALSO transparent, a scroll-timing overshoot in the canvas's
          clip-path (see ShaderCanvas.tsx's updateClip) shows raw shader
          colour through it. An opaque background at this single ancestor
          covers every page in the group structurally, rather than requiring
          each new page with a Band to remember its own bg-surface. */}
      <main id="main-content" className="flex-1 bg-surface">{children}</main>
      <SiteFooter />
    </>
  );
}
