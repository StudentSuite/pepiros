import type { MetadataRoute } from "next";
import { CATALOG } from "@/lib/data/papers";

// Public, content-bearing routes. app/robots.ts disallows everything else
// (the signed-in app, settings, dev tools). Same NEXT_PUBLIC_APP_URL as
// metadataBase in app/layout.tsx, so origin is configured in one place.
const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.9, changeFrequency: "monthly" },
  { path: "/mcp", priority: 0.9, changeFrequency: "monthly" },
  { path: "/docs", priority: 0.8, changeFrequency: "monthly" },
  { path: "/discover", priority: 0.8, changeFrequency: "daily" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/status", priority: 0.6, changeFrequency: "weekly" },
  { path: "/roadmap", priority: 0.5, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/security", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const now = new Date();

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Paper pages are now real routes over a fixed catalogue, so they belong in
  // the sitemap. Profile pages still do not: /u/[username] resolves the same
  // generated profile for any name, and listing those would be listing pages
  // that do not represent distinct people.
  const paperEntries = CATALOG.map((paper) => ({
    url: `${baseUrl}/paper/${paper.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...paperEntries];
}
