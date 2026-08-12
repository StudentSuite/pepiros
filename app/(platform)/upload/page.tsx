"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { FileText, Link as LinkIcon, UploadCloud } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { SkeletonGraph } from "@/components/ui/SkeletonGraph";

type EntryMode = "file" | "url";

/**
 * `/upload` -- client component (drag-over state, tab state, file/url state,
 * checkbox gate). Same `.surface-reading paper-grain` card + FormField
 * contrast-override pattern as `/login` and `/signup` (Task 7 brief). Two
 * entry paths (drop-zone/file-picker, paste-URL) live behind a tab toggle,
 * matching plan.md §1's "Upload a PDF or paste an arXiv/PMC/DOI URL". The
 * license checkbox gates the submit button via the actual `disabled`
 * attribute, not just opacity. Submit never calls fetch, it's a
 * pretend-success `router.push("/workspaces")` (Global Constraints -- no
 * real upload/parse pipeline in this build).
 */
export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<EntryMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasEntry = mode === "file" ? file !== null : url.trim().length > 0;
  const canSubmit = licenseConfirmed && hasEntry;

  // `SiteHeader` stays rendered and clickable during the SkeletonGraph
  // display, so a user can navigate away mid-redirect-wait. Without this
  // cleanup, the orphaned timeout still fires after unmount and silently
  // yanks the user (now elsewhere in the app) to /workspaces.
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "url" && !url.trim()) {
      setUrlError("Paste an arXiv, PMC, or DOI URL.");
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);
    // Pretend-success (Global Constraints -- no real upload/parse pipeline):
    // show the skeleton-graph choreography for a couple seconds so the
    // pacing beat from plan.md §1 is actually visible before the redirect.
    redirectTimeoutRef.current = setTimeout(() => {
      router.push("/workspaces");
    }, 2200);
  }

  if (submitting) {
    return (
      <main className="flex justify-center px-6 pb-24 pt-20 sm:pt-28">
        <div className="w-full max-w-lg rounded-lg border border-border bg-surface-raised p-s-6">
          <SkeletonGraph />
        </div>
      </main>
    );
  }

  return (
    <main className="flex justify-center px-6 pb-24 pt-20 sm:pt-28">
      <div className="surface-reading paper-grain w-full max-w-lg rounded-lg p-s-6">
        <Logo variant="paper" />

        <h1 className="mt-6 font-serif text-2xl text-[#1c1a15]">Upload a paper</h1>
        <p className="mt-1 font-sans text-sm text-[#1c1a15]/70">
          Upload a PDF or paste an arXiv, PMC, or DOI URL. We build the grounding graph from there.
        </p>

        <div role="tablist" aria-label="Paper source" className="mt-6 flex gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "file"}
            onClick={() => setMode("file")}
            className={buttonClassName(mode === "file" ? "primary" : "secondary", "sm")}
          >
            <Icon icon={UploadCloud} size="xs" className="mr-1.5" />
            Upload PDF
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "url"}
            onClick={() => setMode("url")}
            className={buttonClassName(mode === "url" ? "primary" : "secondary", "sm")}
          >
            <Icon icon={LinkIcon} size="xs" className="mr-1.5" />
            Paste URL
          </button>
        </div>

        {/* FormField's label/hint/error contrast on this paper card is handled
            by the scoped `.surface-reading` cascade rule in app/globals.css. */}
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
          {mode === "file" ? (
            <div>
              <div
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openFilePicker();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={clsx(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition duration-fast ease-out",
                  dragOver ? "border-accent bg-accent/5" : "border-[#1c1a15]/25 hover:border-[#1c1a15]/45",
                )}
              >
                <Icon icon={file ? FileText : UploadCloud} size="md" className="text-[#1c1a15]/60" />
                {file ? (
                  <p className="font-sans text-sm text-[#1c1a15]">{file.name}</p>
                ) : (
                  <>
                    <p className="font-sans text-sm text-[#1c1a15]">Drag a PDF here, or click to browse</p>
                    <p className="font-sans text-xs text-[#1c1a15]/70">PDF only</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <FormField label="Paper URL" required error={urlError} hint="arXiv, PMC, or DOI link">
              <Input
                type="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setUrlError(undefined);
                }}
                placeholder="https://arxiv.org/abs/..."
                required
              />
            </FormField>
          )}

          <label className="flex items-start gap-2 font-sans text-xs text-[#1c1a15]">
            <input
              type="checkbox"
              checked={licenseConfirmed}
              onChange={(event) => setLicenseConfirmed(event.target.checked)}
              required
              className="mt-0.5 accent-accent"
            />
            <span>
              This paper is open-access or CC-licensed, or I understand it stays private to my workspace.
            </span>
          </label>

          <p className="font-sans text-xs text-[#1c1a15]/70">
            Publishing runs the grounding graph automatically, no manual &ldquo;analyze&rdquo; step.
          </p>

          <Button type="submit" variant="primary" className="mt-2 w-full" disabled={!canSubmit}>
            Upload
          </Button>
        </form>
      </div>
    </main>
  );
}
