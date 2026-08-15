// POST. Accepts a PDF upload (multipart) or a source URL (JSON), validates it
// per docs/PLAN-V1.md §6, and returns a jobId to poll via GET /api/jobs/[id].
// Kicks off the real parse -> generate pipeline (lib/services/ingest.ts) in
// the background rather than only queuing a job with nothing behind it.
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchWorkspace } from "@/lib/services/workspace";
import { MAX_UPLOAD_BYTES, findDuplicate, validateUpload } from "@/lib/services/upload";
import { createJob, failJob } from "@/lib/services/jobs";
import { runIngest, queueUrlIngest } from "@/lib/services/ingest";

/**
 * Fire-and-forget: the route returns 202 with a jobId immediately (§6), and
 * the real pipeline -- a PyMuPDF subprocess plus a Groq generator fan-out --
 * runs for the 15-45s plan.md §1 quotes, reporting progress through
 * lib/services/jobs.ts for GET /api/jobs/[id] to stream. This only keeps
 * running because `next dev`/a long-lived Node process stays up after the
 * response is sent; a serverless deployment would need an explicit
 * background-work primitive (e.g. Vercel's waitUntil), which is out of scope
 * here.
 */
function startIngest(input: Parameters<typeof runIngest>[0]) {
  void runIngest(input).catch((err) => {
    failJob(input.jobId, err instanceof Error ? err.message : String(err));
  });
}

const urlBodySchema = z.object({
  workspaceId: z.string(),
  url: z.string().min(1),
});

function rejection(message: string, code: string, extra: Record<string, unknown> = {}) {
  // 422, not 400: the request was well-formed, the *file* is the problem.
  // A client can tell "you sent me nonsense" from "your PDF won't work".
  return NextResponse.json({ error: code, detail: message, ...extra }, { status: 422 });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  // --- URL path ---
  if (contentType.includes("application/json")) {
    const parsed = urlBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const result = await queueUrlIngest(parsed.data.workspaceId, parsed.data.url);
    if ("error" in result) {
      if (result.error === "duplicate") {
        // Not an error: §6 wants a merge-or-open-existing prompt, so this is
        // a 409 the UI can offer a choice on rather than a hard refusal.
        return NextResponse.json({ error: "duplicate", duplicate: result.duplicate, detail: result.detail }, { status: 409 });
      }
      return rejection(result.detail, result.error);
    }

    return NextResponse.json({ jobId: result.jobId, source: result.source }, { status: 202 });
  }

  // --- File upload path ---
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

    const workspaceId = String(form.get("workspaceId") ?? "");
    const file = form.get("file");
    if (!workspaceId || !(file instanceof File)) {
      return NextResponse.json({ error: "invalid_body", detail: "workspaceId and file are required" }, { status: 400 });
    }

    // Checked before reading the body into memory: a 2GB upload should not be
    // buffered just to discover it's too big.
    if (file.size > MAX_UPLOAD_BYTES) {
      return rejection(
        `That PDF is ${(file.size / (1024 * 1024)).toFixed(1)}MB. The limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`,
        "too_large",
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateUpload(bytes, file.size);
    if (!validation.ok) {
      return rejection(validation.message ?? "That file can't be processed.", validation.rejection ?? "invalid_file");
    }

    const workspace = await fetchWorkspace(workspaceId);
    const duplicate = findDuplicate({ title: file.name.replace(/\.pdf$/i, "") }, workspace.papers);
    if (duplicate) {
      return NextResponse.json(
        { error: "duplicate", duplicate, detail: `This looks like "${duplicate.title}", already in this workspace.` },
        { status: 409 },
      );
    }

    const job = createJob({
      workspaceId,
      source: { kind: "upload", filename: file.name, bytes: file.size },
    });

    startIngest({
      jobId: job.id,
      workspaceId,
      paperTitle: file.name.replace(/\.pdf$/i, ""),
      sourceUrl: null,
      bytes,
    });

    return NextResponse.json(
      { jobId: job.id, warnings: validation.warnings, estimatedPages: validation.estimatedPages },
      { status: 202 },
    );
  }

  return NextResponse.json(
    { error: "unsupported_content_type", detail: "Send multipart/form-data with a file, or JSON with a url." },
    { status: 415 },
  );
}
