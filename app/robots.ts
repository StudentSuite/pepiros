import type { MetadataRoute } from "next";

// Blocks authenticated/app-internal surfaces (a user's own workspace data,
// account settings, the dev token-reference page) -- allows the public
// marketing site and the published-paper platform (discover, paper pages,
// profiles). Same NEXT_PUBLIC_APP_URL used by metadataBase (app/layout.tsx)
// and sitemap.ts -- one "what's my own origin" env var, not several.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/workspaces",
        "/w/",
        "/settings",
        "/welcome",
        "/upload",
        "/reset-password",
        "/dev/",
        "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
