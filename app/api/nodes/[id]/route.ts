// TODO: GET|PATCH|DELETE single node. PATCH writes a node_versions row (author: user). DELETE cascades per PLAN-V1.md §4.6 invariant 4.
import { notImplemented } from "@/lib/api/notImplemented";

export async function GET() {
  return notImplemented("GET /api/nodes/[id]");
}

export async function PATCH() {
  return notImplemented("PATCH /api/nodes/[id]");
}

export async function DELETE() {
  return notImplemented("DELETE /api/nodes/[id]");
}
