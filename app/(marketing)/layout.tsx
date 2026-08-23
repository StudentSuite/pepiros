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
      <main id="main-content" className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
