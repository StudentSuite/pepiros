// GET. SSE stream of a job's progress (docs/PLAN-V1.md §6). Emits the full
// stage list with each stage marked done/current/pending, so the UI can render
// the whole sequence and light it up rather than showing an indeterminate
// spinner.
//
// Reads through lib/services/jobs.ts, which is process-local until there's a
// Postgres to read `job_events` from -- see that file's note.
import { getJob, stageProgress } from "@/lib/services/jobs";

const POLL_MS = 500;
/** Stop streaming eventually rather than holding a connection open forever. */
const MAX_DURATION_MS = 2 * 60 * 1000;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!getJob(id)) {
    return new Response(JSON.stringify({ error: "not_found", detail: `No job ${id}.` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPayload = "";

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      while (Date.now() - startedAt < MAX_DURATION_MS) {
        const job = getJob(id);
        if (!job) {
          send("error", { error: "job_disappeared" });
          break;
        }

        const payload = {
          jobId: job.id,
          status: job.status,
          stages: stageProgress(job),
          events: job.events,
          error: job.error,
        };

        // Only re-send on change: an unchanged 9-stage payload every 500ms is
        // noise the client has to diff anyway.
        const serialized = JSON.stringify(payload);
        if (serialized !== lastPayload) {
          send("progress", payload);
          lastPayload = serialized;
        }

        if (job.status === "done" || job.status === "failed") break;
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx and friends buffer SSE by default, which turns a live stream into
      // one delivery at the end.
      "X-Accel-Buffering": "no",
    },
  });
}
