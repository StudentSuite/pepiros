import { NextResponse } from "next/server";

/**
 * Placeholder handler so app/api/* stubs are valid route modules (Next.js
 * requires at least one exported HTTP method per route.ts) without getting
 * ahead of the actual implementation described in each file's TODO comment.
 * Replace with real logic per-route; this function is not meant to survive
 * into a finished route.
 */
export function notImplemented(routeDescription: string) {
  return NextResponse.json(
    { error: "not_implemented", route: routeDescription },
    { status: 501 },
  );
}
