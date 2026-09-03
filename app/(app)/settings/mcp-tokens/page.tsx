import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDemoAccount } from "@/lib/data/demo";
import { McpTokens } from "@/components/settings/McpTokens";
import { DemoNotice } from "@/components/settings/DemoNotice";
import { listMcpTokens } from "@/lib/services/mcpTokens";

export const metadata: Metadata = { title: "MCP tokens" };

export default async function McpTokensPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const tokens = await listMcpTokens(profile.id);
  const demo = isDemoAccount(profile);

  return (
    <div>
      {demo && <DemoNotice />}

      <header className="pb-s-5">
        <h2 className="font-sans font-semibold text-lg text-ink">MCP tokens</h2>
        <p className="mt-1 max-w-prose font-sans text-sm leading-relaxed text-ink-faint">
          Connect Claude, Codex, or Cursor so an agent can check its own claims
          against a source, mid-conversation.
        </p>
      </header>

      <McpTokens initial={tokens} readOnly={demo} />
    </div>
  );
}
