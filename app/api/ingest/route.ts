// POST. Accepts a PDF upload (multipart) or a source URL (JSON), validates it
// per docs/PLAN-V1.md §6, and returns a jobId to poll via GET /api/jobs/[id].
//
// Validation is real and enforced here. Parsing is not: PyMuPDF isn't
// installed and scripts/parse.py is still a stub, so a validated upload is
// accepted and its job reports the stages it can honestly report, rather than
// this route pretending a graph was built. The seam for real parsing is
// lib/services/ingest.ts.
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchWorkspace } from "@/lib/services/workspace";
import {
  MAX_UPLOAD_BYTES,
  findDuplicate,
  resolveSourceUrl,
  validateUpload,
} from "@/lib/services/upload";
import { createJob } from "@/lib/services/jobs";

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

    const resolved = resolveSourceUrl(parsed.data.url);
    if (resolved.kind === "unsupported") {
      return rejection(resolved.message ?? "Unsupported link.", "unsupported_source");
    }

    const workspace = await fetchWorkspace(parsed.data.workspaceId);
    const duplicate = findDuplicate(
      { title: parsed.data.url, doi: resolved.doi ?? null },
      workspace.papers,
    );
    if (duplicate) {
      // Not an error: §6 wants a merge-or-open-existing prompt, so this is a
      // 409 the UI can offer a choice on rather than a hard refusal.
      return NextResponse.json(
        { error: "duplicate", duplicate, detail: `This looks like "${duplicate.title}", already in this workspace.` },
        { status: 409 },
      );
    }

    const job = createJob({
      workspaceId: parsed.data.workspaceId,
      source: { kind: resolved.kind, url: resolved.pdfUrl ?? parsed.data.url, doi: resolved.doi },
    });
    return NextResponse.json({ jobId: job.id, source: resolved }, { status: 202 });
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
