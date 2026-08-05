import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill in your Supabase project's values.`);
  }
  return value;
}

/** Server Component / Route Handler client: respects the caller's auth cookie. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}

/**
 * Service-role client: bypasses RLS. Server-only, used by mcp/server.ts and
 * ingest/verify services that must write across a caller's own row-level
 * permissions (e.g. the seed script). Never import from a client component
 * or a route handler that echoes request input back into a query.
 */
export function createSupabaseServiceClient() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Copy .env.example to .env and fill in your Supabase project's service role key.");
  }
  return createServerClient(url, serviceKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
