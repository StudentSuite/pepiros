/**
 * Mock profile for `/u/[username]` -- this build has no real backend (see
 * Global Constraints in the frontend v1 plan). One fixed profile is enough
 * (Task 7 brief): `getMockProfile` returns it regardless of the username
 * param rather than standing up a multi-user mock database.
 *
 * `papers` cross-references lib/mock/discover.ts by slug -- both papers here
 * already list "Priya Subramaniam" as an author over there, so the profile
 * and the discover catalog agree on who published what.
 */
export type MockProfile = {
  username: string;
  displayName: string;
  bio: string;
  avatarInitials: string;
  papers: string[];
  followerCount: number;
  followingCount: number;
};

export const mockProfile: MockProfile = {
  username: "priyasub",
  displayName: "Priya Subramaniam",
  bio: "Researcher working across clinical NLP and coastal ecology. I read a lot of papers I don't write, and post the ones worth a closer look here.",
  avatarInitials: "PS",
  papers: ["few-shot-calibration-clinical-note-summarization", "coral-bleaching-thermal-stress-indo-pacific"],
  followerCount: 214,
  followingCount: 58,
};

/**
 * Single mock profile, always. `username` is accepted (and typed) to match
 * the real per-user lookup this will become, but intentionally unused here
 * -- returning the same fixed profile for any username is this task's own
 * scope, not a bug (Task 7 brief).
 */
export function getMockProfile(_username: string): MockProfile {
  return mockProfile;
}
