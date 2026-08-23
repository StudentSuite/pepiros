import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/services/mcpOAuth";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import { decideAuthorization } from "./actions";

export const metadata: Metadata = { title: "Authorize access" };

/**
 * The OAuth 2.1 authorization endpoint (issue #109, docs/PLAN-V1.md §13.4):
 * a remote MCP client (already dynamically registered via
 * POST /api/mcp/oauth/register) sends the signed-in user's browser here to
 * grant it access. Real consent, not a silent auto-approve -- the same
 * explicit-action bar as minting a token in Settings today, just reached
 * from a different starting point.
 *
 * Validates client_id/redirect_uri/PKCE params up front: an unknown client
 * or an unlisted redirect_uri gets an inline error page rather than a
 * redirect, since OAuth 2.1 forbids redirecting anywhere once those can't be
 * trusted. Only once those check out does a missing session become a
 * redirect to /login -- with the full query string preserved as `next`,
 * unlike middleware.ts's generic protection (which only preserves the
 * pathname, and would silently drop client_id/redirect_uri/code_challenge
 * if this route were just added to its PROTECTED list instead).
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const responseType = firstValue(params.response_type);
  const clientId = firstValue(params.client_id);
  const redirectUri = firstValue(params.redirect_uri);
  const codeChallenge = firstValue(params.code_challenge);
  const codeChallengeMethod = firstValue(params.code_challenge_method);
  const state = firstValue(params.state);

  if (!clientId || !redirectUri || !codeChallenge) {
    return <ErrorScreen title="Missing required parameters" detail="client_id, redirect_uri, and code_challenge are all required." />;
  }
  if (responseType !== "code") {
    return <ErrorScreen title="Unsupported response_type" detail={`Expected "code", got "${responseType ?? "(none)"}".`} />;
  }
  if (codeChallengeMethod !== "S256") {
    return <ErrorScreen title="Unsupported code_challenge_method" detail='Only "S256" is supported (plain PKCE is not accepted).' />;
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    return <ErrorScreen title="Unknown client" detail="This client is not registered. Register it via POST /api/mcp/oauth/register first." />;
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return <ErrorScreen title="redirect_uri not allowed" detail="This redirect_uri was not included in the client's registration." />;
  }

  const profile = await getSession();
  if (!profile) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const v = firstValue(value);
      if (v) query.set(key, v);
    }
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${query.toString()}`)}`);
  }

  return (
    // Issue #311: matches the AuthShell pattern #301 established for
    // /login, /signup, /reset-password* -- same auth-flow, centered-card,
    // minimal-chrome family. This route has no (platform)-group layout
    // ancestor, so, like /auth/reset-callback, it supplies its own <main>
    // landmark rather than relying on one further up the tree.
    <main id="main-content">
      <AuthShell>
        <h1 className="mt-s-5 font-sans font-bold text-xl text-ink">Authorize access</h1>
        <p className="mt-s-2 font-sans text-sm leading-relaxed text-ink-muted">
          <strong className="text-ink">{client.clientName ?? "An application"}</strong> wants to access your
          Pepiros account (<span className="text-ink">{profile.username}</span>) over MCP -- searching papers,
          checking claims, and (if you allow write access) creating nodes on your behalf.
        </p>

        <form action={decideAuthorization} className="mt-s-5 flex flex-col gap-s-4">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          {/* Issue #280: response_type/code_challenge_method never round-tripped
              through this form. If the session check above redirects to /login
              (session expired mid-consent) and the user signs back in,
              decideAuthorization's !profile branch reconstructs this page's URL
              from formData.entries() -- without these two fields in that data,
              they came back missing, and this page's own validation above then
              rejected the resumed request as "Unsupported response_type".
              Both are already validated above by the time this form renders, so
              hardcoding their one accepted value here is safe. */}
          <input type="hidden" name="response_type" value="code" />
          <input type="hidden" name="code_challenge_method" value="S256" />
          {state && <input type="hidden" name="state" value={state} />}

          <fieldset className="flex flex-col gap-s-2">
            <legend className="font-sans text-xs font-medium uppercase tracking-wide text-ink-faint">
              Access level
            </legend>
            <label className="flex items-center gap-2 font-sans text-sm text-ink">
              <input type="radio" name="scope" value="read" defaultChecked className="accent-accent" />
              Read-only -- search and verify claims, no changes
            </label>
            <label className="flex items-center gap-2 font-sans text-sm text-ink">
              <input type="radio" name="scope" value="write" className="accent-accent" />
              Read and write -- also create nodes
            </label>
          </fieldset>

          <div className="flex gap-2 pt-1">
            <Button type="submit" name="intent" value="deny" variant="secondary" className="flex-1">
              Deny
            </Button>
            <Button type="submit" name="intent" value="allow" variant="primary" className="flex-1">
              Allow
            </Button>
          </div>
        </form>
      </AuthShell>
    </main>
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function ErrorScreen({ title, detail }: { title: string; detail: string }) {
  return (
    <main id="main-content">
      <AuthShell>
        <h1 className="mt-s-5 font-sans font-bold text-lg text-unsupported">{title}</h1>
        <p className="mt-s-2 font-sans text-sm text-ink-muted">{detail}</p>
      </AuthShell>
    </main>
  );
}
