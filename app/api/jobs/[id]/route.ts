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

/**
 * Sleep for one poll interval, or return early the moment the client
 * disconnects, whichever happens first.
 *
 * The listener is always removed: an AbortSignal outlives this call, and
 * leaking one listener per poll would mean 240 of them over a full-length
 * stream.
 */
function sleepUntilPollOrAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, POLL_MS);
    signal.addEventListener("abort", done, { once: true });
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

      // The client going away is the common case, not the exceptional one:
      // the reader closes the tab, or navigates off the workspace, long
      // before a two-minute ingest finishes. Without this the loop kept
      // polling every 500ms for the remainder of MAX_DURATION_MS against a
      // socket nobody was reading, holding one of the browser's six
      // per-origin connections the whole time. Two or three abandoned
      // ingests were enough to starve the rest of the app of sockets.
      //
      // `request.signal` is already aborted by the runtime on disconnect, so
      // there is nothing to wire up beyond reading it -- which is why the
      // parameter is no longer named `_request`.
      const { signal } = request;

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      while (Date.now() - startedAt < MAX_DURATION_MS) {
        if (signal.aborted) break;

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

        // Race the poll interval against the disconnect rather than sleeping
        // through it: checking `aborted` only at the top of the loop would
        // still leave up to POLL_MS of dead polling after the tab closes,
        // and on a slow job that is the difference between releasing the
        // socket now and releasing it half a second from now, every time.
        await sleepUntilPollOrAbort(signal);
      }

      // enqueue() on a stream whose consumer has gone throws, and so does
      // close(); neither is a real failure here, it is just the disconnect
      // arriving between the check above and the call below.
      try {
        controller.close();
      } catch {
        // Already closed by the runtime on abort. Nothing to do.
      }
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
