// No Github icon here: lucide dropped brand marks, which is why the repo
// hand-rolls one elsewhere. ExternalLink carries the same "leaves the site"
// meaning without vendoring another SVG for one row.
import { BookOpen, ExternalLink, Library, MapPin } from "lucide-react";
import { CATALOG } from "@/lib/data/papers";
import { ProfileShell } from "@/components/profile/ProfileShell";

/**
 * The /open profile's fixed configuration, shared by every one of its tabs.
 *
 * Each tab route renders this with its own `activeHref` rather than the shell
 * living in a layout.tsx. A layout cannot read the current pathname without
 * becoming a client component, and there is no reason to ship this to the
 * browser just to underline one tab.
 *
 * Following and Followers are deliberately absent. /open has no owner, so
 * those two tabs would be permanently empty and dishonest in a way the other
 * three are not: "0 papers" is a real state, "0 followers" for something that
 * cannot be followed is a broken affordance.
 */
export function OpenProfile({
  activeHref,
  children,
}: {
  activeHref: string;
  children: React.ReactNode;
}) {
  return (
    <ProfileShell
      name="Open"
      handle="/open"
      bio="The public Pepiros catalog. Every paper here is catalogued with its source and licence, and gets a mindmap once it has been indexed."
      activeHref={activeHref}
      tabs={[
        { href: "/open", label: "Overview" },
        { href: "/open/papers", label: "Papers", count: CATALOG.length },
        { href: "/open/activity", label: "Recent activity" },
      ]}
      meta={[
        { icon: <Library className="size-4" />, label: "Public catalog" },
        { icon: <MapPin className="size-4" />, label: "No owner, community catalogue" },
        {
          icon: <BookOpen className="size-4" />,
          label: "How grounding works",
          href: "/how-it-works",
        },
        {
          icon: <ExternalLink className="size-4" />,
          label: "StudentSuite/pepiros",
          href: "https://github.com/StudentSuite/pepiros",
        },
      ]}
    >
      {children}
    </ProfileShell>
  );
}
