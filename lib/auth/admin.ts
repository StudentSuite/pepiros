import type { Profile } from "@/lib/data/types";

/**
 * Who can reach /admin (issue #234).
 *
 * Two ways in, on purpose:
 *
 * 1. `profiles.is_admin`, set by hand in the SQL editor. There is deliberately
 *    no role-management UI: a screen that grants admin is a far larger
 *    security surface than a column nothing in the app can write.
 * 2. The usernames below, as a bootstrap. Without one, /admin is unreachable
 *    on a fresh database until somebody has already run SQL against it, which
 *    is a circular dependency on the one surface you need in order to see
 *    whether anything is working.
 *
 * The bootstrap list is checked against the session's *stored* username, not
 * against anything the request supplies, and usernames are unique in
 * `profiles`. It is not a secret and is not doing the work of authentication:
 * the account still has to exist and still has to be signed in.
 *
 * Override with PEPIROS_ADMIN_USERNAMES (comma-separated) to change this
 * without a code change.
 */
const DEFAULT_ADMIN_USERNAMES = ["anaydhawan"];

function configuredAdmins(): string[] {
  const raw = process.env.PEPIROS_ADMIN_USERNAMES;
  if (!raw) return DEFAULT_ADMIN_USERNAMES;
  return raw
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminProfile(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  return configuredAdmins().includes(profile.username.toLowerCase());
}
