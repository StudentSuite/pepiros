import type { Profile } from "./types";

/**
 * The shared demo account.
 *
 * Anyone can sign in as this account, so it is not a normal user: destructive
 * actions on it would let one visitor wreck the demo for everyone after them,
 * and there is no owner to recover it. Surfaces that can delete or irreversibly
 * change data check this and hide themselves rather than rendering a button
 * that must then be specially handled.
 */
export const DEMO_USERNAME = "guest";

export function isDemoAccount(profile: Pick<Profile, "username">): boolean {
  return profile.username === DEMO_USERNAME;
}
