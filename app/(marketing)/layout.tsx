import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

/**
 * Marketing route group: pure content, no auth-aware chrome. SiteHeader
 * renders with its default (signed-out) session -- this group never
 * branches on mock auth state.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
