import { ProfileShellSkeleton } from "@/components/profile/ProfileShellSkeleton";

/**
 * /open had no loading.tsx at all, so it fell through to the root
 * app/loading.tsx: a narrow max-w-3xl column, which is the wrong shape and
 * the wrong width for this page's max-w-6xl two-column shell.
 *
 * `rows={6}` rather than the default: /open lists the whole catalog, so more
 * of the column is filled on arrival than on a person's profile.
 */
export default function OpenLoading() {
  return <ProfileShellSkeleton rows={6} />;
}
