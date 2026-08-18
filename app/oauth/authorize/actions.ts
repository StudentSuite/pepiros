"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient, issueAuthorizationCode } from "@/lib/services/mcpOAuth";
import type { McpScope } from "@/lib/services/mcpAuth";

/**
 * Handles the consent form's Allow/Deny submission (issue #109). Every
 * field arrives as a hidden form field carrying the original /authorize
 * query params through the GET -> render -> POST round trip, so this
 * re-validates all of them server-side rather than trusting what the page
 * rendered -- a hidden field is still client-controlled input.
 */
export async function decideAuthorization(formData: FormData): Promise<void> {
  const intent = formData.get("intent");
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const state = formData.get("state");
  const scope = String(formData.get("scope") ?? "read") as McpScope;

  const client = await getOAuthClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    // No safe place to redirect to -- an unknown client or an unlisted
    // redirect_uri must not send the user anywhere, per OAuth 2.1.
    throw new Error("Invalid OAuth client or redirect_uri.");
  }

  const deniedUrl = new URL(redirectUri);
  deniedUrl.searchParams.set("error", "access_denied");
  if (state) deniedUrl.searchParams.set("state", String(state));

  if (intent !== "allow") {
    redirect(deniedUrl.toString());
  }

  const profile = await getSession();
  if (!profile) {
    // Session expired between the page render and this submit -- back to
    // login, preserving the whole authorize request to resume after.
    const authorizeUrl = new URL("/oauth/authorize", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
    for (const [key, value] of formData.entries()) {
      if (key === "intent") continue;
      authorizeUrl.searchParams.set(key, String(value));
    }
    redirect(`/login?next=${encodeURIComponent(`${authorizeUrl.pathname}${authorizeUrl.search}`)}`);
  }

  const code = await issueAuthorizationCode({
    clientId,
    profileId: profile.id,
    redirectUri,
    codeChallenge,
    scope: scope === "write" ? "write" : "read",
    workspaceId: null,
  });

  const successUrl = new URL(redirectUri);
  successUrl.searchParams.set("code", code);
  if (state) successUrl.searchParams.set("state", String(state));
  redirect(successUrl.toString());
}
