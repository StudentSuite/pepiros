"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Where a password-reset email's link lands (lib/data/supabase-adapter.ts's
 * requestPasswordReset() sets this as resetPasswordForEmail's redirectTo).
 *
 * NOT a server route, unlike app/auth/callback/route.ts (Google sign-in):
 * Google's flow is PKCE, so the code verifier lives in a cookie the browser
 * already set and Supabase hands the server `?code=` to exchange. This
 * project's recovery emails use the implicit flow instead -- confirmed live,
 * not assumed, by generating a real recovery link via the Admin API and
 * following it: Supabase redirected to `...#access_token=...&type=recovery`,
 * a URL *hash* fragment, which a server route can never see (fragments
 * aren't sent in the HTTP request at all). Only the browser can read it.
 *
 * The Supabase browser client (@supabase/ssr's createBrowserClient) detects
 * that fragment automatically on creation (detectSessionInUrl, on by
 * default) and fires a `PASSWORD_RECOVERY` auth event once the session from
 * it is established -- the officially documented signal for exactly this
 * moment, so this page waits for that event rather than parsing the hash
 * itself. Establishing the session client-side still makes it visible
 * server-side too (that's what @supabase/ssr's cookie sync is for), which is
 * what lets POST /api/auth/reset-password/confirm read it back to actually
 * change the password.
 */
export default function ResetCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/reset-password/confirm");
      }
    });

    // No PASSWORD_RECOVERY event within a few seconds means there was no
    // valid recovery fragment in the URL at all (link already used, copied
    // wrong, or this page reached directly) -- surfaced the same way
    // app/(platform)/reset-password/page.tsx already handles a failed link.
    const timeout = setTimeout(() => setFailed(true), 4000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  useEffect(() => {
    if (failed) router.replace("/reset-password?error=invalid_link");
  }, [failed, router]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6">
      <p className="font-sans text-sm text-ink-muted">Confirming your reset link…</p>
    </main>
  );
}
