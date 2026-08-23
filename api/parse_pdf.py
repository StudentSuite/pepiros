"""
Hosted PDF parse endpoint (StudentSuite/pepiros#318).

A Vercel Python Function, file-based convention (`handler` class extending
BaseHTTPRequestHandler -- see Vercel's own docs for that convention; this
directory is deliberately at the project root, sibling to `app/`, not
inside it, so it never collides with Next.js's own `app/api/*` routes).
This is a separate runtime from the Next.js app's Node functions, which is
the whole point: it has a real Python interpreter, which Vercel's Node
runtime does not.

WHAT THIS DOES AND DOES NOT DO. Reuses scripts/parse.py's actual functions
(imported below, not duplicated -- scripts/parse.py itself is completely
unmodified by this change) for text/section/chunk/numeric/reference/
metadata extraction: the real, already-tested PyMuPDF pipeline. It does NOT
run scripts/parse.py's optional Pix2Text pass (equation/figure extraction):
that pulls in torch/onnxruntime, real weight that would blow well past a
lean serverless bundle for two of twenty-two generators. This is not a new
degradation -- scripts/parse.py already degrades to "no equations, no
figures" when Pix2Text isn't importable (its own ImportError branch), which
is exactly the state a machine without `pip install pix2text` is in today.
This function is permanently in that same, already-honest state.

WHY A URL, NOT THE UPLOADED BYTES DIRECTLY. lib/services/ingest.ts's
runParsePyHosted() sends `{"url": "<signed Supabase Storage URL>"}`, not
the PDF itself -- Vercel Function request bodies are capped well under
this app's own 50MB upload limit, so posting raw bytes would silently fail
on any real-sized paper. Downloading the file inside this function (a
normal outbound HTTP call, not constrained by that inbound-request cap)
sidesteps the ceiling entirely.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

# scripts/ is a sibling of api/ at the project root, not a package on the
# default path -- Vercel's Python runtime bundles "all files reachable from
# the project root" (its own docs), so the file is present, it just needs
# to be findable by `import`.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

import pymupdf as fitz  # noqa: E402  (after the sys.path fix, deliberately)
from parse import (  # noqa: E402
    chunk_section,
    extract_authors,
    extract_blocks,
    extract_numerics,
    extract_references,
    extract_year,
    group_into_sections,
)

MIN_CHARS_PER_PAGE = 20  # mirrors scripts/parse.py's own scanned-PDF floor, kept in sync manually


def build_document(doc: "fitz.Document") -> dict:
    """The non-Pix2Text half of scripts/parse.py's main(), factored out so
    both entrypoints can share it without duplicating the assembly logic.
    Intentionally NOT imported from scripts/parse.py itself: that file's
    main() is a CLI entrypoint (argv, sys.exit, stdout printing) wired
    together with the Pix2Text pass this function must skip, so extracting
    just the shared middle would have meant editing the already-working,
    already-tested CLI script to accommodate a caller it didn't have
    before. Every function this DOES call is imported, not reimplemented.
    """
    entries = extract_blocks(doc)

    total_chars = sum(len(e["text"]) for e in entries)
    if len(doc) > 0 and total_chars < MIN_CHARS_PER_PAGE * len(doc):
        raise ValueError(
            f"This PDF appears to be scanned or image-only: only {total_chars} characters of "
            f"extractable text were found across {len(doc)} page(s). There is no OCR fallback "
            "wired up yet, so a scanned PDF can't be ingested."
        )

    sections = group_into_sections(entries)

    out_sections = []
    out_chunks = []
    out_numerics = []

    for section in sections:
        if section["title"].strip().lower() in ("references", "bibliography"):
            continue

        out_sections.append({"title": section["title"], "order": len(out_sections)})
        section_index = len(out_sections) - 1

        for chunk in chunk_section(section["blocks"]):
            blocks = [section["blocks"][i] for i in chunk["block_indices"]]
            chunk_index = len(out_chunks)
            out_chunks.append(
                {
                    "page": blocks[0]["page"] if blocks else 1,
                    "kind": "prose",
                    "text": chunk["text"],
                    "sectionIndex": section_index,
                    "rects": [
                        {"page": b["page"], "x0": b["bbox"][0], "y0": b["bbox"][1], "x1": b["bbox"][2], "y1": b["bbox"][3]}
                        for b in blocks
                    ],
                }
            )
            out_numerics.extend(extract_numerics(chunk_index, chunk["text"]))

    metadata_title = (doc.metadata or {}).get("title", "").strip() or None
    page1_blocks = [e for e in entries if e["page"] == 1]
    page1_text = "\n".join(b["text"] for b in page1_blocks)

    return {
        "title": metadata_title,
        "authors": extract_authors(doc.metadata, page1_blocks),
        "year": extract_year(doc.metadata, page1_text),
        "sections": out_sections,
        "chunks": out_chunks,
        "numerics": out_numerics,
        "figures": [],  # Pix2Text-only, always empty on this path -- see module docstring
        "references": extract_references(sections),
        "pageCount": len(doc),
    }


def download_pdf(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "pepiros-parse-pdf/1"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(length) if length > 0 else b""
            payload = json.loads(raw_body or b"{}")
            url = payload.get("url")
            if not url or not isinstance(url, str):
                self._send_json(400, {"error": "request body must be JSON with a string 'url' field"})
                return

            try:
                pdf_bytes = download_pdf(url)
            except urllib.error.URLError as err:
                self._send_json(502, {"error": f"could not download the PDF from the signed URL: {err}"})
                return

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            try:
                result = build_document(doc)
            except ValueError as err:
                # The scanned/image-only case: a real, expected failure mode,
                # not a server error.
                self._send_json(422, {"error": str(err)})
                return
            finally:
                doc.close()

            self._send_json(200, result)
        except Exception as err:  # noqa: BLE001 -- last-resort: always answer JSON, never let the connection just drop
            self._send_json(500, {"error": f"{type(err).__name__}: {err}"})
