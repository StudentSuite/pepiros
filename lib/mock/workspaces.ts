export type MockWorkspace = {
  id: string;
  name: string;
  paperCount: number;
  /** Pre-formatted relative time (no real timestamps to diff against, this
   * is mock data) -- e.g. "2 hours ago". */
  lastOpened: string;
};

/**
 * `ws-1` matches the seeded `fixtures/workspace.json` demo workspace (3
 * papers, per its `papers` array) so its card links to a real, working
 * `/w/ws-1` route. The other two are illustrative-only, they have no
 * backing fixture and their cards route to `/w/[id]` same as any real
 * workspace would once one exists.
 */
export const mockWorkspaces: MockWorkspace[] = [
  {
    id: "ws-1",
    name: "Circadian Rhythm & Cognition",
    paperCount: 3,
    lastOpened: "2 hours ago",
  },
  {
    id: "ws-2",
    name: "Urban Heat & Public Health",
    paperCount: 5,
    lastOpened: "yesterday",
  },
  {
    id: "ws-3",
    name: "LLM Evaluation Methods",
    paperCount: 1,
    lastOpened: "5 days ago",
  },
];
