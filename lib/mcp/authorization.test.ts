import { describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "@/mcp/tools/index";
import type { McpTokenRecord } from "@/lib/services/mcpAuth";

/**
 * Issue #36: a real token now actually gates tool calls (not just gets
 * minted and ignored). These call registered handlers directly through the
 * SDK's private tool map -- the same thing lib/mcp/registry.test.ts already
 * does to introspect registration -- rather than standing up a transport.
 */
async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }> })
    ._registeredTools;
  return tools[name]!.handler(args) as Promise<{ content: Array<{ text: string }>; isError?: boolean }>;
}

const readToken: McpTokenRecord = { id: "t-read", scope: "read", workspaceId: null, revokedAt: null };
const writeToken: McpTokenRecord = { id: "t-write", scope: "write", workspaceId: null, revokedAt: null };
const pinnedToken: McpTokenRecord = { id: "t-pinned", scope: "write", workspaceId: "ws-1", revokedAt: null };

describe("mcp tool authorization", () => {
  it("no session (no token configured) leaves every tool unrestricted", async () => {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, null);
    const res = await callTool(server, "create_workspace", { name: "Unrestricted" });
    expect(res.isError).toBeFalsy();
  });

  it("a read-only token is denied on write tools", async () => {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, readToken);
    const res = await callTool(server, "create_workspace", { name: "Should fail" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toMatch(/read-only/i);
  });

  it("a write token is allowed on write tools", async () => {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, writeToken);
    const res = await callTool(server, "create_workspace", { name: "Should succeed" });
    expect(res.isError).toBeFalsy();
  });

  it("a workspace-pinned token is denied on a different workspace", async () => {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, pinnedToken);
    const res = await callTool(server, "list_papers", { workspace_id: "ws-2" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toMatch(/pinned/i);
  });

  it("a workspace-pinned token is allowed on its own workspace", async () => {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, pinnedToken);
    const res = await callTool(server, "list_papers", { workspace_id: "ws-1" });
    expect(res.isError).toBeFalsy();
  });

  it("list_workspaces filters out workspaces a pinned token cannot reach", async () => {
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, pinnedToken);
    const res = await callTool(server, "list_workspaces", {});
    const parsed = JSON.parse(res.content[0]!.text) as { workspaces: Array<{ workspace_id: string }> };
    expect(parsed.workspaces.every((w) => w.workspace_id === "ws-1")).toBe(true);
  });
});
