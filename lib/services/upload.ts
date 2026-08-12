import { tokenSetRatio } from "@/lib/grounding/fuzzy";
import type { Paper } from "@/types/anchor";

/**
 * Upload validation (docs/PLAN-V1.md §6). Pure functions over bytes and
 * strings, so every rule is testable without a live upload or a running
 * parser.
 *
 * These limits existed only as prose in a TODO comment before this file; the
 * constants are exported so the UI and the route enforce the same numbers
 * rather than each hardcoding its own and drifting.
 */

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_PAGES = 120;

export type UploadRejection =
  | "empty_file"
  | "too_large"
  | "not_a_pdf"
  | "too_many_pages"
  | "no_text_layer";

export interface UploadValidation {
  ok: boolean;
  rejection?: UploadRejection;
  /** Human-readable, and specific: §6 wants the problem named, not a generic failure. */
  message?: string;
  /** Non-blocking observations (e.g. probably-not-English). */
  warnings: string[];
  estimatedPages?: number;
}

/** `%PDF-` in ASCII. Checked instead of the extension, which lies. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d];

export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  return PDF_MAGIC.every((byte, i) => bytes[i] === byte);
}

/**
 * Page-count estimate from the raw bytes, by counting `/Type /Page` objects.
 *
 * Deliberately an estimate: the authoritative count comes from PyMuPDF at
 * parse time, and this runs before the file is ever handed to a parser. It
 * undercounts a PDF whose page objects live in compressed object streams, so
 * it is used only to reject the obviously-too-large -- never to assert a
 * precise length to the user. Erring toward accepting a borderline file is the
 * right bias here: parse will catch it, and a wrongly-rejected upload is worse
 * than a wrongly-accepted one that fails later with a better message.
 */
export function estimatePageCount(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  // /Type /Page but not /Type /Pages -- the latter is the tree node, not a leaf.
  const matches = text.match(/\/Type\s*\/Page(?![s\w])/g);
  return matches?.length ?? 0;
}

/**
 * Whether the file looks like it has a real text layer.
 *
 * A scanned PDF is page images with no embedded fonts, so the absence of any
 * `/Font` reference is a decent pre-flight signal. It is a heuristic, not a
 * substitute for the real zero-extractable-text check that runs during
 * parsing -- its whole job is to let the UI say "scanned PDF, no text layer"
 * up front (§6) instead of showing a spinner that resolves into an empty
 * graph.
 */
export function looksLikeTextLayer(bytes: Uint8Array): boolean {
  const text = new TextDecoder("latin1").decode(bytes);
  return /\/Font\b/.test(text) || /\/ToUnicode\b/.test(text);
}

/**
 * Rough non-Latin-script signal for the "non-English → warn, proceed" rule
 * (§6). Warns, never blocks: a paper in another language still parses, and
 * guessing language from bytes is not reliable enough to refuse an upload on.
 */
export function looksNonLatin(bytes: Uint8Array): boolean {
  const sample = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 200_000));
  const cjk = sample.match(/[　-鿿가-힯]/g)?.length ?? 0;
  const cyrillic = sample.match(/[Ѐ-ӿ]/g)?.length ?? 0;
  return cjk + cyrillic > 200;
}

/** Validation order is cheapest-rejection-first, so a huge file dies on size. */
export function validateUpload(bytes: Uint8Array, declaredSize?: number): UploadValidation {
  const size = declaredSize ?? bytes.byteLength;
  const warnings: string[] = [];

  if (size === 0) {
    return { ok: false, rejection: "empty_file", message: "That file is empty.", warnings };
  }

  if (size > MAX_UPLOAD_BYTES) {
    const mb = (size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      rejection: "too_large",
      message: `That PDF is ${mb}MB. The limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`,
      warnings,
    };
  }

  if (!hasPdfMagicBytes(bytes)) {
    return {
      ok: false,
      rejection: "not_a_pdf",
      message: "That file isn't a PDF (its contents don't start with %PDF-, whatever the extension says).",
      warnings,
    };
  }

  const estimatedPages = estimatePageCount(bytes);
  if (estimatedPages > MAX_PAGES) {
    return {
      ok: false,
      rejection: "too_many_pages",
      message: `That PDF looks like about ${estimatedPages} pages. The limit is ${MAX_PAGES}.`,
      warnings,
      estimatedPages,
    };
  }

  if (!looksLikeTextLayer(bytes)) {
    return {
      ok: false,
      rejection: "no_text_layer",
      // Naming the actual problem is the point of this check (§6) -- anchoring
      // needs real text, and a scanned PDF would otherwise produce an empty
      // graph with no explanation.
      message:
        "That looks like a scanned PDF with no text layer. Pepiros anchors claims to real text, so it needs a PDF with selectable text.",
      warnings,
      estimatedPages,
    };
  }

  if (looksNonLatin(bytes)) {
    warnings.push("This paper may not be in English. Extraction will run, but quality may vary.");
  }

  return { ok: true, warnings, estimatedPages };
}

// --- URL resolution (§6) --------------------------------------------------

export type SourceKind = "arxiv" | "pmc" | "doi" | "direct_pdf" | "unsupported";

export interface ResolvedSource {
  kind: SourceKind;
  /** Direct PDF URL to fetch, when one can be derived without a network call. */
  pdfUrl?: string;
  /** DOI, when the input was one -- resolution needs Unpaywall at fetch time. */
  doi?: string;
  message?: string;
}

const ARXIV_ABS = /arxiv\.org\/abs\/([\w.\-/]+)/i;
const ARXIV_PDF = /arxiv\.org\/pdf\/([\w.\-/]+)/i;
const PMC = /ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d+)/i;
const DOI_URL = /(?:doi\.org\/|dx\.doi\.org\/)(10\.\d{4,9}\/[^\s]+)/i;
const BARE_DOI = /^(10\.\d{4,9}\/\S+)$/;

/**
 * Maps a pasted URL to something fetchable. arXiv `abs` → `pdf` is a pure
 * rewrite; PMC and DOI need a network hop at fetch time, so they're
 * classified here and resolved later rather than pretending to resolve now.
 */
export function resolveSourceUrl(input: string): ResolvedSource {
  const url = input.trim();
  if (!url) return { kind: "unsupported", message: "Paste a link first." };

  const bareDoi = url.match(BARE_DOI);
  if (bareDoi) return { kind: "doi", doi: bareDoi[1] };

  const doiUrl = url.match(DOI_URL);
  if (doiUrl) return { kind: "doi", doi: doiUrl[1] };

  const arxivPdf = url.match(ARXIV_PDF);
  if (arxivPdf) return { kind: "arxiv", pdfUrl: `https://arxiv.org/pdf/${arxivPdf[1]!.replace(/\.pdf$/, "")}` };

  const arxivAbs = url.match(ARXIV_ABS);
  if (arxivAbs) return { kind: "arxiv", pdfUrl: `https://arxiv.org/pdf/${arxivAbs[1]}` };

  const pmc = url.match(PMC);
  if (pmc) {
    return {
      kind: "pmc",
      pdfUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmc[1]}/pdf/`,
    };
  }

  if (/^https?:\/\/\S+\.pdf(\?\S*)?$/i.test(url)) return { kind: "direct_pdf", pdfUrl: url };

  if (/^https?:\/\//i.test(url)) {
    return {
      kind: "unsupported",
      message:
        "That link isn't a PDF, arXiv, PMC, or DOI URL. Paste one of those, or upload the PDF directly.",
    };
  }

  return { kind: "unsupported", message: "That doesn't look like a URL or a DOI." };
}

// --- Duplicate detection (§6) --------------------------------------------

export interface DuplicateMatch {
  paperId: string;
  title: string;
  /** How it matched: an exact DOI beats a fuzzy title, and is worth surfacing. */
  reason: "doi" | "title";
  score: number;
}

const TITLE_DUPLICATE_THRESHOLD = 0.9;

/**
 * DOI first, then fuzzy title (§6). Reuses the same `tokenSetRatio` the
 * grounding spine uses, rather than introducing a second notion of "similar
 * text" to this codebase.
 *
 * Returns a match for the UI to offer merge-or-open-existing; it never decides
 * on the user's behalf, since two papers legitimately can share a title.
 */
export function findDuplicate(
  candidate: { title: string; doi?: string | null },
  existing: Paper[],
): DuplicateMatch | null {
  if (candidate.doi) {
    const needle = candidate.doi.trim().toLowerCase();
    for (const paper of existing) {
      // sourceUrl is where a DOI would currently live -- there is no doi column
      // on Paper yet (types/anchor.ts is a frozen contract; adding one needs a
      // coordinated change), so this checks for containment rather than equality.
      if (paper.sourceUrl?.toLowerCase().includes(needle)) {
        return { paperId: paper.id, title: paper.title, reason: "doi", score: 1 };
      }
    }
  }

  let best: DuplicateMatch | null = null;
  for (const paper of existing) {
    const score = tokenSetRatio(candidate.title, paper.title);
    if (score >= TITLE_DUPLICATE_THRESHOLD && (!best || score > best.score)) {
      best = { paperId: paper.id, title: paper.title, reason: "title", score };
    }
  }
  return best;
}

// --- Job stages (§6) ------------------------------------------------------

/**
 * The stage list §6 specifies, in order, streamed over SSE from `job_events`.
 * Exported so the UI can render the whole sequence up front and light each one
 * as it lands, rather than only ever knowing the current stage.
 */
export const JOB_STAGES = [
  "Fetching PDF",
  "Extracting text",
  "Finding sections",
  "Building numeric ledger",
  "Reading methods",
  "Planning your workspace",
  "Writing notes",
  "Locating anchors",
  "Ready",
] as const;

export type JobStage = (typeof JOB_STAGES)[number];
