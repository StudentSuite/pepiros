import { ProfileShellSkeleton } from "@/components/profile/ProfileShellSkeleton";

/**
 * This route was rebuilt onto <ProfileShell> (a GitHub-shaped tab bar, left
 * identity rail, content beside it), but its loading state was still the
 * previous design's: a centred avatar over a centred name over a centred bio.
 * Every load therefore flashed a layout the page no longer has and then
 * jumped sideways into the real one.
 *
 * Shares one skeleton with /open so the two cannot drift apart again.
 */
export default function ProfileLoading() {
  return <ProfileShellSkeleton />;
}
