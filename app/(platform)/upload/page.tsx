import type { Metadata } from "next";
import { isPdfIngestSupportedHere } from "@/lib/services/ingest";
import { UploadForm } from "./UploadForm";

export const metadata: Metadata = {
  title: "Add a paper",
  description: "Start from a PDF or a link.",
};

/**
 * Server shell for the upload form.
 *
 * The form itself is a client component (drag/drop, an SSE progress stream),
 * but whether ingest can run at all is a property of the server runtime, not
 * of the browser. Issue #295: reading it here and passing it down means the
 * page's own warning and the route's 501 come from one predicate
 * (isPdfIngestSupportedHere) instead of two that can disagree.
 */
export default function UploadPage() {
  return <UploadForm ingestSupported={isPdfIngestSupportedHere()} />;
}
