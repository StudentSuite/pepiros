import { afterEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";

vi.mock("./ingestStore", () => ({
  getIngestedWorkspace: vi.fn(),
}));

import { getIngestedWorkspace } from "./ingestStore";
import { fetchWorkspaceData } from "./workspace";

const mockGetIngested = vi.mocked(getIngestedWorkspace);
const workspace = workspaceFixture as unknown as Workspace;

describe("fetchWorkspaceData fixture fallback", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns the fixture for a workspace that was never ingested", async () => {
    mockGetIngested.mockResolvedValue(undefined);
    const ws = await fetchWorkspaceData(workspace.id);
    expect(ws.id).toBe(workspace.id);
    expect(ws.papers.length).toBeGreaterThan(0);
  });

  it("throws instead of returning the fixture when the DB is configured but the read failed", async () => {
    const dbError = new Error("connect ECONNREFUSED");
    mockGetIngested.mockRejectedValue(dbError);
    await expect(fetchWorkspaceData(workspace.id)).rejects.toBe(dbError);
  });
});