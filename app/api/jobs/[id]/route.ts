// TODO: GET, SSE stream of job_events (stage, message, progress). See PLAN-V1.md §6 job stages list.
import { notImplemented } from "@/lib/api/notImplemented";

export async function GET() {
  return notImplemented("GET /api/jobs/[id]");
}
