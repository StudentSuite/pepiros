"use client";

import { createBrowserClient } from "@supabase/ssr";

function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill in your Supabase project's values.`);
  }
  return value;
}

/** Browser-side client: Auth (session) + Realtime (job status) + Storage reads. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
