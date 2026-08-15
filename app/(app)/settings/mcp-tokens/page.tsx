import type { Metadata } from "next";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { McpTokens } from "@/components/settings/McpTokens";
import { mockMcpTokens } from "@/lib/mock/settings";

export const metadata: Metadata = { title: "MCP tokens" };

export default function McpTokensPage() {
  return (
    <SettingsSection
      title="MCP tokens"
      description="Connect Claude, Codex, or Cursor so an agent can check its own claims against a source."
    >
      <McpTokens initial={mockMcpTokens} />
    </SettingsSection>
  );
}
