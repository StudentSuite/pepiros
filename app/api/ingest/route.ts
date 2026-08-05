// TODO: POST. Accepts PDF upload or URL (arXiv/PMC/DOI/direct). Validates magic bytes + page cap (<=50MB, <=120pp),
// zero-extractable-text check -> triggers PaddleOCR-VL fallback. Enqueues a job, returns jobId. See PLAN-V1.md §6.
import { notImplemented } from "@/lib/api/notImplemented";

export async function POST() {
  return notImplemented("POST /api/ingest");
}
