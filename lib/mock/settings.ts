export type MockMcpToken = {
  id: string;
  label: string;
  createdAt: string;
  lastUsed: string | null;
};

/** Single-user settings mock -- no auth, no persistence (Global Constraints). */
export const mockProfile: { name: string; email: string; avatarInitials: string } = {
  name: "Anay Dhawan",
  email: "anay@pepiros.dev",
  avatarInitials: "AD",
};

export const mockMcpTokens: MockMcpToken[] = [
  {
    id: "tok-1",
    label: "Claude Desktop",
    createdAt: "2026-07-14",
    lastUsed: "2 hours ago",
  },
  {
    id: "tok-2",
    label: "Local dev server",
    createdAt: "2026-07-29",
    lastUsed: "yesterday",
  },
  {
    id: "tok-3",
    label: "CI smoke test",
    createdAt: "2026-08-02",
    lastUsed: null,
  },
];
