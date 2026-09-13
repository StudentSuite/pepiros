import { afterEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@/types/anchor";
import workspaceFixture from "@/fixtures/workspace.json";
import { getIngestedWorkspace } from "./ingestStore";

const getWorkspaceMock = vi.fn();
vi.mock("@/lib/db/queries", () => ({
  getWorkspace: (...args: unknown[]) => getWorkspaceMock(...args),
}));

const isDatabaseConfiguredMock = vi.fn();
vi.mock("@/lib/db/client", () => ({
  isDatabaseConfigured: (...args: unknown[]) => isDatabaseConfiguredMock(...args),
}));

const workspace = workspaceFixture as unknown as Workspace;

describe("getIngestedWorkspace", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves an ingested workspace when the read succeeds", async () => {
    getWorkspaceMock.mockResolvedValue({ workspace, version: 3 });
    const result = await getIngestedWorkspace(workspace.id);
    expect(result?.workspace.id).toBe(workspace.id);
    expect(result?.version).toBe(3);
  });

  it("resolves undefined when no row exists (never ingested)", async () => {
    getWorkspaceMock.mockResolvedValue(undefined);
    await expect(getIngestedWorkspace(workspace.id)).resolves.toBeUndefined();
  });

  it("falls back to the fixture when no database is configured", async () => {
    isDatabaseConfiguredMock.mockReturnValue(false);
    getWorkspaceMock.mockRejectedValue(new Error("DATABASE_URL is not set"));
    await expect(getIngestedWorkspace(workspace.id)).resolves.toBeUndefined();
    expect(isDatabaseConfiguredMock).toHaveBeenCalled();
  });

  it("rethrows instead of swallowing when the database is configured but the read fails", async () => {
    isDatabaseConfiguredMock.mockReturnValue(true);
    const dbError = new Error("getaddrinfo ENOTFOUND db.ref.supabase.co");
    getWorkspaceMock.mockRejectedValue(dbError);
    await expect(getIngestedWorkspace(workspace.id)).rejects.toBe(dbError);
  });
});