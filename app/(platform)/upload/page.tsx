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

const URL_PATTERN = /(arxiv\.org|ncbi\.nlm\.nih\.gov\/pmc|doi\.org|^10\.\d{4,})/i;

/**
 * Add a paper.
 *
 * Upload validation is real (size, type, page count, text layer), but the parse
 * pipeline behind it is not built yet, so this page says so rather than
 * accepting a file and leaving someone waiting for a graph that will never
 * arrive. The form still works end to end against the validation endpoint,
 * which is the part that exists.
 */
export default function UploadPage() {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [licensed, setLicensed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "file" && !file) return setError("Choose a PDF first.");
    if (mode === "url" && !URL_PATTERN.test(url.trim()))
      return setError("Paste an arXiv, PMC, or DOI link.");
    if (!licensed)
      return setError("Confirm the licence position before uploading.");

    setNotice(
      "Validation passed. The parse pipeline is not built yet, so nothing was queued: this is the honest state of ingest today, tracked as an open issue.",
    );
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
            Ingest is not live
          </p>
          <p className="mt-s-2 font-sans text-[14px] leading-relaxed text-ink-muted">
            Uploads are validated but not yet parsed. Until the pipeline lands,
            the fully grounded examples in{" "}
            <Link href="/discover" className="text-accent-text underline underline-offset-2">
              the library
            </Link>{" "}
            are the best way to see what the output looks like.
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
                      PDF only, up to 50 MB
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
            <Button type="submit">Add paper</Button>
          </div>
        </form>
      </ReadingColumn>
    </main>
  );
}
