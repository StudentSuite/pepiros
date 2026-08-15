import { describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "@/mcp/tools/index";
import { LIVE_TOOL_NAMES, PLANNED_TOOL_NAMES, TOOL_REGISTRY } from "./registry";

/**
 * The drift guard for issue #37: mcp/tools/index.ts must register exactly
 * the tools lib/mcp/registry.ts marks "live" -- not more, not fewer. This is
 * what keeps the `/mcp` page, llms.txt, and the actual server from
 * disagreeing about the tool count again.
 */
describe("mcp tool registry", () => {
  it("has no duplicate names", () => {
    const names = TOOL_REGISTRY.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("live and planned tool sets are disjoint", () => {
    const overlap = LIVE_TOOL_NAMES.filter((n) => PLANNED_TOOL_NAMES.includes(n));
    expect(overlap).toEqual([]);
  });

  it("registerTools() registers exactly the live tools, no more, no fewer", () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    registerTools(server);

    const registered = Object.keys(
      (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools,
    );

    expect(new Set(registered)).toEqual(new Set(LIVE_TOOL_NAMES));
  });
});
