import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getSession } from "@/lib/auth/session";

/**
 * Platform route group: public pages with auth-aware chrome (discover,
 * paper detail, profile, login/signup, upload). Issue #88: this used to
 * pass a hardcoded signed-out mock session unconditionally, so a signed-in
 * user saw "Sign in / Sign up" here regardless of their real session --
 * app/(platform)/paper/[slug]/page.tsx, in the same route group, already
 * called getSession() for its own comment-form gating, it just was never
 * threaded into the header.
 */
export default async function PlatformLayout({
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
