import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Where an ingested PDF actually lives (issue #278).
 *
 * THE PROBLEM THIS SOLVES. Ingest wrote parsed PDFs to `process.cwd()/data/
 * pdfs` and the reader's PDF route read back from the same local path, so a
 * paper ingested on a laptop had its graph in Postgres (real, shared, visible
 * from production) and its PDF only on that laptop. On the hosted site
 * getPaperPdfBytes() therefore always returned null, PdfPane always fell back
 * to MockPdfPane, and the mock flows chunk text as HTML while highlights are
 * drawn at PDF point-space coordinates. Two unrelated coordinate systems,
 * which is why a highlight landed on the wrong words or on blank space.
 *
 * Ingest is local-only for a separate, architectural reason (no Python on the
 * hosted runtime, issue #295). That limitation is survivable. Losing the file
 * afterwards is not: with the PDF in Storage, a paper ingested locally is
 * fully readable in production, page images and highlights included, which is
 * the difference between "you have to run it locally to add a paper" and "a
 * paper you added never really works".
 *
 * SHAPE. `Paper.pdfStoragePath` is now a Storage object key. Legacy rows hold
 * a bare filename relative to the old local directory, so reads fall back to
 * disk when Storage misses. That fallback is what makes this a migration
 * rather than a breaking change, and it is also what keeps a purely local dev
 * loop working with no Supabase credentials at all.
 */

/** Private, service-role access only. Never a public bucket: an uploaded paper is not ours to publish. */
export const PDF_BUCKET = "papers";

/**
 * Legacy local directory. Still the write target when Storage is not
 * configured, so `npm run dev` with no Supabase keys behaves exactly as it
 * did before.
 */
const LOCAL_PDF_DIR = path.join(process.cwd(), "data", "pdfs");

export function resolveLocalPdfPath(relativePath: string): string {
  return path.join(LOCAL_PDF_DIR, relativePath);
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Namespaced by workspace so the bucket stays browsable and a workspace's
 * files can be removed as a prefix rather than tracked row by row.
 */
export function pdfObjectKey(workspaceId: string, paperId: string): string {
  return `${workspaceId}/${paperId}.pdf`;
}

/** A Storage key, as opposed to a legacy bare filename, is the one with a slash in it. */
function looksLikeObjectKey(storagePath: string): boolean {
  return storagePath.includes("/");
}

/**
 * Uploads the PDF and returns the key to persist on the paper row, or null
 * when Storage is not configured so the caller keeps its local-disk path.
 *
 * Never throws: a Storage outage must not fail an ingest whose actual work
 * (parse, generate, verify) has already succeeded. The graph is the valuable
 * output and it is already in Postgres; a missing PDF degrades the reader to
 * the mock pane, which is exactly the pre-#278 behaviour rather than a new
 * failure.
 */
export async function uploadPdf(
  workspaceId: string,
  paperId: string,
  bytes: Uint8Array,
): Promise<string | null> {
  if (!isStorageConfigured()) return null;

  const key = pdfObjectKey(workspaceId, paperId);
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.storage.from(PDF_BUCKET).upload(key, bytes, {
      contentType: "application/pdf",
      // A re-ingest of the same paper id is a replacement, not a conflict.
      upsert: true,
    });
    if (error) {
      console.error(`[pdfStorage] upload(${key}) failed:`, error.message);
      return null;
    }
    return key;
  } catch (err) {
    console.error(`[pdfStorage] upload(${key}) threw:`, err);
    return null;
  }
}

/**
 * A short-lived signed URL for a stored PDF (StudentSuite/pepiros#318): the
 * bucket is private, service-role-only, so a plain public fetch of the
 * object never works. The hosted parse function (api/parse_pdf.py) needs
 * exactly this -- a URL it can `urlopen()` from a separate Vercel Function
 * with no Supabase credentials of its own -- rather than exposing the
 * service-role key to that function directly.
 *
 * 5 minutes: the parse function fetches it within seconds of this call, not
 * minutes later, so this is generous headroom rather than a tuned budget.
 */
export async function createSignedPdfUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(PDF_BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) {
    throw new Error(`Could not create a signed URL for ${storagePath}: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}

/**
 * Reads a stored PDF back, Storage first and local disk second.
 *
 * The order matters for the migration: a row written before this change holds
 * a bare filename that will never be in Storage, and a row written after
 * holds a key that will never be on this machine's disk. Trying both, in this
 * order, means one code path serves both without a backfill.
 */
export async function downloadPdf(storagePath: string): Promise<Uint8Array | null> {
  if (isStorageConfigured() && looksLikeObjectKey(storagePath)) {
    try {
      const supabase = createSupabaseServiceClient();
      const { data, error } = await supabase.storage.from(PDF_BUCKET).download(storagePath);
      if (!error && data) return new Uint8Array(await data.arrayBuffer());
      if (error) console.error(`[pdfStorage] download(${storagePath}) failed:`, error.message);
    } catch (err) {
      console.error(`[pdfStorage] download(${storagePath}) threw:`, err);
    }
  }

  try {
    return await readFile(resolveLocalPdfPath(storagePath));
  } catch {
    return null;
  }
}

/**
 * Best-effort delete, for the failed-ingest cleanup path (issue #271) so a
 * run that dies after upload does not leave an orphaned object behind.
 */
export async function deletePdf(storagePath: string): Promise<void> {
  if (!isStorageConfigured() || !looksLikeObjectKey(storagePath)) return;
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
  } catch (err) {
    console.error(`[pdfStorage] remove(${storagePath}) threw:`, err);
  }
}
