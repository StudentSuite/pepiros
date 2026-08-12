export type MockWorkspace = {
  id: string;
  name: string;
  paperCount: number;
  /** Pre-formatted relative time (no real timestamps to diff against, this
   * is mock data) -- e.g. "2 hours ago". */
  lastOpened: string;
};

/**
 * Only `ws-1` is listed. It matches the seeded `fixtures/workspace.json`
 * demo workspace (3 papers, per its `papers` array), so its card links to a
 * real, working `/w/ws-1` route.
 *
 * This used to also list `ws-2` and `ws-3` as illustrative-only cards, but
 * `lib/services/workspace.ts`'s `fetchWorkspace(_workspaceId)` ignores the id
 * and always returns the single seeded fixture -- so clicking either card
 * landed on a reader titled "Circadian Rhythm & Cognition" regardless of
 * which workspace was promised. `fetchWorkspace` is backend territory
 * (`lib/services/`) and out of scope to change here, so the fix is on the
 * mock-data side: don't ship cards for workspaces that don't actually exist.
 */
export const mockWorkspaces: MockWorkspace[] = [
  {
    id: "ws-1",
    name: "Circadian Rhythm & Cognition",
    paperCount: 3,
    lastOpened: "2 hours ago",
  },
];
