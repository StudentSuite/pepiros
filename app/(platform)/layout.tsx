import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { mockSession } from "@/lib/mock/session";

/**
 * Platform route group: public pages with auth-aware chrome (discover,
 * paper detail, profile, login/signup, upload). Passes `mockSession`
 * explicitly -- same value SiteHeader would default to on its own, but
 * spelling it out here marks this group as the one meant to branch on auth
 * state as more of it lands in later tasks.
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader session={mockSession} />
      {children}
      <SiteFooter />
    </>
  );
}
