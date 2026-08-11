/**
 * Mock auth session -- this build has no real backend (see Global Constraints
 * in the frontend v1 plan; a separate pass wires real Supabase Auth). Every
 * page that needs to know "am I signed in" reads this single literal instead
 * of standing up cookies/context/provider machinery.
 *
 * Defaults to signed-out (`null`) so most pages render their honest default
 * state rather than assuming a logged-in demo user.
 */
export type MockUser = {
  name: string;
  username: string;
  avatarInitials: string;
};

export const mockSession: { user: MockUser } | null = null;
