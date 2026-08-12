import { describe, expect, it } from "vitest";
import type { Paper } from "@/types/anchor";
import {
  MAX_PAGES,
  MAX_UPLOAD_BYTES,
  estimatePageCount,
  findDuplicate,
  hasPdfMagicBytes,
  looksLikeTextLayer,
  resolveSourceUrl,
  validateUpload,
} from "./upload";

/** Minimal bytes that pass magic-byte, page-count, and text-layer checks. */
function fakePdf(options: { pages?: number; fonts?: boolean; padTo?: number } = {}): Uint8Array {
  const { pages = 1, fonts = true, padTo } = options;
  let body = "%PDF-1.7\n";
  body += "1 0 obj\n<< /Type /Pages /Count " + pages + " >>\nendobj\n";
  for (let i = 0; i < pages; i++) {
    body += `${i + 2} 0 obj\n<< /Type /Page /Parent 1 0 R >>\nendobj\n`;
  }
  if (fonts) body += "99 0 obj\n<< /Type /Font /Subtype /Type1 >>\nendobj\n";
  body += "%%EOF\n";

  const bytes = new TextEncoder().encode(body);
  if (padTo && padTo > bytes.byteLength) {
    const padded = new Uint8Array(padTo);
    padded.set(bytes);
    return padded;
  }
  return bytes;
}

describe("hasPdfMagicBytes", () => {
  it("accepts a real PDF header", () => {
    expect(hasPdfMagicBytes(fakePdf())).toBe(true);
  });

  // The extension is the thing users trust and the thing that lies.
  it("rejects a non-PDF regardless of what it was named", () => {
    expect(hasPdfMagicBytes(new TextEncoder().encode("PK zip really"))).toBe(false);
  });

  it("rejects a file too short to contain the header", () => {
    expect(hasPdfMagicBytes(new Uint8Array([0x25, 0x50]))).toBe(false);
  });
});

describe("estimatePageCount", () => {
  it("counts page leaf objects", () => {
    expect(estimatePageCount(fakePdf({ pages: 7 }))).toBe(7);
  });

  // /Type /Pages is the tree node, not a page -- counting it would inflate
  // every estimate by one and reject 120-page PDFs at 119.
  it("does not count the /Type /Pages tree node as a page", () => {
    expect(estimatePageCount(fakePdf({ pages: 1 }))).toBe(1);
  });
});

describe("looksLikeTextLayer", () => {
  it("sees a text layer when fonts are present", () => {
    expect(looksLikeTextLayer(fakePdf({ fonts: true }))).toBe(true);
  });

  it("flags a font-less PDF, which is what a scan looks like", () => {
    expect(looksLikeTextLayer(fakePdf({ fonts: false }))).toBe(false);
  });
});

describe("validateUpload", () => {
  it("accepts a normal PDF", () => {
    const result = validateUpload(fakePdf({ pages: 12 }));
    expect(result.ok).toBe(true);
    expect(result.rejection).toBeUndefined();
    expect(result.estimatedPages).toBe(12);
  });

  it("rejects an empty file", () => {
    const result = validateUpload(new Uint8Array(0));
    expect(result).toMatchObject({ ok: false, rejection: "empty_file" });
  });

  it("rejects an oversized file, and says how big it was", () => {
    const result = validateUpload(fakePdf(), MAX_UPLOAD_BYTES + 1);
    expect(result.rejection).toBe("too_large");
    expect(result.message).toContain("50MB");
  });

  // Size is checked before anything reads the bytes, so a huge non-PDF dies
  // on the cheap check rather than being decoded first.
  it("checks size before file type", () => {
    const result = validateUpload(new TextEncoder().encode("not a pdf"), MAX_UPLOAD_BYTES + 1);
    expect(result.rejection).toBe("too_large");
  });

  it("rejects a non-PDF", () => {
    const result = validateUpload(new TextEncoder().encode("PK actually a zip"));
    expect(result.rejection).toBe("not_a_pdf");
    expect(result.message).toContain("%PDF-");
  });

  it("rejects a PDF over the page cap", () => {
    const result = validateUpload(fakePdf({ pages: MAX_PAGES + 5 }));
    expect(result.rejection).toBe("too_many_pages");
    expect(result.message).toContain(String(MAX_PAGES));
  });

  it("accepts a PDF exactly at the page cap", () => {
    expect(validateUpload(fakePdf({ pages: MAX_PAGES })).ok).toBe(true);
  });

  // §6 is explicit that this must name the problem rather than let the UI
  // look broken.
  it("names the scanned-PDF problem instead of failing generically", () => {
    const result = validateUpload(fakePdf({ fonts: false }));
    expect(result.rejection).toBe("no_text_layer");
    expect(result.message).toContain("scanned PDF");
    expect(result.message).toContain("text layer");
  });
});

describe("resolveSourceUrl", () => {
  it("rewrites an arXiv abs link to its PDF", () => {
    expect(resolveSourceUrl("https://arxiv.org/abs/2301.12345")).toEqual({
      kind: "arxiv",
      pdfUrl: "https://arxiv.org/pdf/2301.12345",
    });
  });

  it("normalizes an arXiv pdf link that already ends in .pdf", () => {
    expect(resolveSourceUrl("https://arxiv.org/pdf/2301.12345.pdf")).toEqual({
      kind: "arxiv",
      pdfUrl: "https://arxiv.org/pdf/2301.12345",
    });
  });

  it("recognizes a PMC article", () => {
    const result = resolveSourceUrl("https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/");
    expect(result.kind).toBe("pmc");
    expect(result.pdfUrl).toContain("PMC1234567");
  });

  it("recognizes a DOI URL and a bare DOI", () => {
    expect(resolveSourceUrl("https://doi.org/10.1000/abc123")).toEqual({
      kind: "doi",
      doi: "10.1000/abc123",
    });
    expect(resolveSourceUrl("10.1000/abc123")).toEqual({ kind: "doi", doi: "10.1000/abc123" });
  });

  it("accepts a direct PDF link", () => {
    expect(resolveSourceUrl("https://example.org/paper.pdf").kind).toBe("direct_pdf");
  });

  it("explains what it accepts when given some other web page", () => {
    const result = resolveSourceUrl("https://example.org/blog/post");
    expect(result.kind).toBe("unsupported");
    expect(result.message).toContain("arXiv");
  });

  it("rejects empty input with a usable message", () => {
    expect(resolveSourceUrl("   ").message).toBe("Paste a link first.");
  });
});

describe("findDuplicate", () => {
  const existing: Paper[] = [
    {
      id: "p1",
      workspaceId: "ws-1",
      title: "Effects of Morning Bright Light Exposure on Sleep Onset Latency in Shift Workers",
      authors: ["A. Okafor"],
      year: 2022,
      archetype: "rct",
      sourceUrl: "https://doi.org/10.1000/bright-light",
      pdfStoragePath: null,
    },
  ];

  it("matches on DOI, and says that's why", () => {
    const match = findDuplicate({ title: "Something else entirely", doi: "10.1000/bright-light" }, existing);
    expect(match).toMatchObject({ paperId: "p1", reason: "doi", score: 1 });
  });

  it("matches a near-identical title", () => {
    const match = findDuplicate(
      { title: "Effects of Morning Bright Light Exposure on Sleep Onset Latency in Shift Workers" },
      existing,
    );
    expect(match).toMatchObject({ paperId: "p1", reason: "title" });
    expect(match!.score).toBeGreaterThanOrEqual(0.9);
  });

  it("does not match an unrelated paper", () => {
    expect(findDuplicate({ title: "Deep Learning for Protein Folding" }, existing)).toBeNull();
  });

  it("returns null against an empty workspace", () => {
    expect(findDuplicate({ title: "Anything", doi: "10.1/x" }, [])).toBeNull();
  });
});
