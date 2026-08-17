"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { callbackUrl } from "@/lib/auth/google";
import { buttonClassName } from "@/components/ui/Button";

/**
 * Starts Google sign-in from the browser.
 *
 * Client-side rather than a server redirect because Supabase's PKCE flow
 * needs the code verifier written by *this* client before the browser leaves
 * for Google -- a server-issued redirect skips that step, and the callback
 * then has nothing to exchange the code against.
 */
export function GoogleSignInButton({
  next = "",
  label = "Continue with Google",
  className,
}: {
  next?: string;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl(window.location.origin, next) },
      });
      // Reaching here without a redirect means the provider is not enabled on
      // the Supabase project -- the one misconfiguration the server cannot
      // detect ahead of time, so it is reported where the user clicked.
      if (authError) {
        setError("Google sign-in is not enabled for this project yet.");
        setPending(false);
      }
    } catch (err) {
      // The real cause used to be discarded entirely here -- "Sign-in is
      // unavailable right now" told a user nothing, and told whoever was
      // debugging a live deployment even less, since it wasn't logged
      // anywhere they could see it either. Logged to the browser console so
      // the actual thrown error (e.g. createSupabaseBrowserClient()'s own
      // "NEXT_PUBLIC_SUPABASE_URL is not set" if that's genuinely missing
      // from the deployed bundle) is inspectable, not just this generic
      // fallback message.
      console.error("[GoogleSignInButton] sign-in failed:", err);
      setError("Sign-in is unavailable right now.");
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className={buttonClassName("secondary", "md", "w-full gap-2.5")}
      >
        <GoogleMark />
        {pending ? "Redirecting…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 font-sans text-xs text-unsupported">
          {error}
        </p>
      )}
    </div>
  );
}

/** Google's mark, inline so the button has no external image dependency. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
