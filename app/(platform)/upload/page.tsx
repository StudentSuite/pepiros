"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FileText, UploadCloud } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Checkbox } from "@/components/shadcn/checkbox";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ReadingColumn } from "@/components/reading/Article";
import { cn } from "@/lib/utils";
import { MAX_PAGES, MAX_UPLOAD_BYTES } from "@/lib/services/upload";

interface IngestResponse {
  jobId?: string;
  error?: string;
  detail?: string;
  estimatedPages?: number;
  warnings?: string[];
  source?: { kind?: string };
  duplicate?: { title?: string };
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileBody(file: File): FormData {
  const form = new FormData();
  form.set("workspaceId", WORKSPACE_ID);
  form.set("file", file);
  return form;
}

/**
 * A 202 means the job was created, not that a graph exists -- nothing
 * advances a job yet. Saying "queued" and naming what is missing keeps this
 * from reading as a promise the app cannot keep.
 */
function describeQueued(body: IngestResponse | null): string {
  const parts = ["Accepted and queued."];
  if (body?.estimatedPages) parts.push(`About ${body.estimatedPages} pages.`);
  if (body?.warnings?.length) parts.push(body.warnings.join(" "));
  parts.push("Parsing is not built yet, so no graph is generated from it — that is the next thing to land.");
  return parts.join(" ");
}

const WORKSPACE_ID = "ws-1";

/**
 * Add a paper.
 *
 * This posts to /api/ingest and reports what the server actually said.
 * Before, `submit` was entirely client-side and ended in "Validation
 * passed." unconditionally -- a 200MB executable renamed .pdf got the same
 * congratulations as a real paper, because the real checks (magic bytes,
 * page cap, text layer, duplicates) live in lib/services/upload.ts and were
 * never called. A validation message that cannot fail is worse than none: it
 * tells the reader their file is fine when nothing looked at it.
 *
 * The parse pipeline behind the endpoint is still a stub, so a successful
 * response means queued, not analyzed, and the copy says exactly that.
 */
export default function UploadPage() {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [licensed, setLicensed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "file" && !file) return setError("Choose a PDF first.");
    if (mode === "url" && !url.trim()) return setError("Paste a link first.");
    if (!licensed) return setError("Confirm the licence position before uploading.");

    // Checked client-side purely to skip a doomed upload of a large file; the
    // server enforces the same limit regardless, since anything here is
    // trivially bypassed.
    if (mode === "file" && file && file.size > MAX_UPLOAD_BYTES) {
      return setError(
        `That file is ${formatMb(file.size)}. The limit is ${formatMb(MAX_UPLOAD_BYTES)}.`,
      );
    }

    setPending(true);
    try {
      const res =
        mode === "file"
          ? await fetch("/api/ingest", { method: "POST", body: fileBody(file!) })
          : await fetch("/api/ingest", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ workspaceId: WORKSPACE_ID, url: url.trim() }),
            });

      const body = (await res.json().catch(() => null)) as IngestResponse | null;

      if (!res.ok) {
        // The route already names the specific problem ("scanned PDF, no text
        // layer"), which is the whole point of validating server-side, so it
        // is shown rather than replaced with a generic failure.
        setError(body?.detail ?? body?.error ?? `Upload failed (${res.status}).`);
        return;
      }

      setNotice(describeQueued(body));
      setFile(null);
      setUrl("");
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="pb-s-8">
      <ReadingColumn>
        <header className="py-s-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Add a paper
          </p>
          <h1 className="mt-s-3 font-serif text-[1.9rem] leading-tight text-ink">
            Start from a PDF or a link.
          </h1>
          <p className="mt-s-3 font-sans text-[15px] leading-relaxed text-ink-muted">
            Pepiros parses the paper into sections, plans its pillars from the
            content, and binds every generated claim to a located quote.
          </p>
        </header>

        <div className="rounded-md border border-dashed border-border p-s-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            What happens to your file
          </p>
          <p className="mt-s-2 font-sans text-[14px] leading-relaxed text-ink-muted">
            Your paper is checked for real: file type, size, page count, whether
            it has a text layer, and whether this workspace already has it.
            Parsing it into a graph is the next thing to land, so nothing is
            generated from it yet. Until then, the fully grounded examples in{" "}
            <Link href="/discover" className="text-accent-text underline underline-offset-2">
              the library
            </Link>{" "}
            show what the output looks like.
          </p>
        </div>

        <form onSubmit={submit} className="mt-s-6 flex flex-col gap-s-5">
          {/* Mode switch */}
          <div
            role="tablist"
            aria-label="Paper source"
            className="flex gap-s-4 border-b border-border"
          >
            {(
              [
                ["file", "Upload a PDF"],
                ["url", "Paste a link"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={cn(
                  "relative pb-s-2 font-sans text-sm transition-colors duration-fast ease-out",
                  mode === value
                    ? "font-medium text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-ink"
                    : "text-ink-faint hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "file" ? (
            <div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) setFile(f);
                }}
                className={cn(
                  "flex w-full flex-col items-center gap-s-3 rounded-md border border-dashed px-s-5 py-s-8",
                  "transition-colors duration-fast ease-out",
                  dragOver
                    ? "border-accent bg-accent-wash"
                    : "border-border hover:border-border-strong",
                )}
              >
                {file ? (
                  <>
                    <FileText className="size-6 text-ink-faint" strokeWidth={1.5} />
                    <p className="max-w-full truncate font-sans text-sm text-ink">
                      {file.name}
                    </p>
                    <p className="font-mono text-[11px] text-ink-faint">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-6 text-ink-faint" strokeWidth={1.5} />
                    <p className="font-sans text-sm text-ink">
                      Drag a PDF here, or click to browse
                    </p>
                    <p className="font-mono text-[11px] text-ink-faint">
                      PDF only, up to {formatMb(MAX_UPLOAD_BYTES)}, {MAX_PAGES} pages
                    </p>
                  </>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-s-2">
              <Label htmlFor="paperUrl">Paper link</Label>
              <Input
                id="paperUrl"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://arxiv.org/abs/1706.03762"
                inputMode="url"
              />
              <p className="font-sans text-[13px] text-ink-faint">
                arXiv, PMC, or a DOI.
              </p>
            </div>
          )}

          <label className="flex items-start gap-s-3">
            <Checkbox
              checked={licensed}
              onCheckedChange={(v) => setLicensed(Boolean(v))}
              className="mt-0.5"
            />
            <span className="font-sans text-[13px] leading-relaxed text-ink-muted">
              This paper is open-access or CC-licensed, or I understand it stays
              private to my workspace and is never added to the public library.
            </span>
          </label>

          {error && <ErrorBanner message={error} />}
          {notice && <ErrorBanner message={notice} variant="warn" />}

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Checking…" : "Add paper"}
            </Button>
          </div>
        </form>
      </ReadingColumn>
    </main>
  );
}
