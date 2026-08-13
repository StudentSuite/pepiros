import type { MetadataRoute } from "next";

// Static, content-bearing public routes only -- app/robots.ts disallows
// everything else (authenticated app views, settings, dev tools).
// /paper/[slug] and /u/[username] entries are intentionally omitted: they
// need real published-paper/profile data, which doesn't exist yet (no live
// Supabase project, see EA's pepiros status notes). Add a dynamic block
// here once lib/services/* reads from real data instead of lib/mock/*.
const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.9, changeFrequency: "monthly" },
  { path: "/mcp", priority: 0.9, changeFrequency: "monthly" },
  { path: "/discover", priority: 0.8, changeFrequency: "daily" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
