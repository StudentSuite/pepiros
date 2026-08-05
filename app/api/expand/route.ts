// TODO (NEW): GET ?paperId=&direction=cites|cited_by. Calls lib/services/citationExpand.ts (OpenAlex API, free, no key).
// Returns ghost-node candidates for canvas-edge expansion. POST variant ingests a selected ghost node for real.
import { notImplemented } from "@/lib/api/notImplemented";

export async function GET() {
  return notImplemented("GET /api/expand");
}

export async function POST() {
  return notImplemented("POST /api/expand");
}
