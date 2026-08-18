#!/usr/bin/env python3
"""
Real PyMuPDF-based parse (plan.md §2, §4.3): PDF path -> sections, chunks
(~500-800 tokens, ~80-token overlap, never crossing a section boundary), a
numeric ledger, and a reference list.

Chunk `rects` are the bounding boxes of the source text blocks a chunk was
built from. lib/grounding/anchor.ts's buildAnchor() uses `chunk.rects`
directly as the anchor's spans (whole-chunk highlighting, per that file's own
comment: sub-line highlighting is future work), so ingest is the only place
that ever computes them.

Local script only (plan.md §2: "Deployed Python service: Killed"), invoked by
lib/services/ingest.ts via child_process, same pattern as scripts/seed.ts.
Prints ONE JSON document to stdout and nothing else; every diagnostic goes to
stderr so a malformed stdout can never break the caller's JSON.parse.
"""
import base64
import contextlib
import io
import json
import os
import re
import sys

import pymupdf as fitz  # PyMuPDF; `pymupdf` is the current package name, `fitz` the historical import alias
from PIL import Image

HEADER_RE = re.compile(
    r"^(abstract|introduction|background|related works?|methods?|methodology|"
    r"materials and methods|results?|discussion|conclusions?|limitations|"
    r"acknowledge?ments?|references?|bibliography|appendix|"
    r"supplementary( materials?)?|\d{1,2}(\.\d+)*\.?\s+[A-Z][a-zA-Z ]{2,40})$",
    re.IGNORECASE,
)
REFERENCES_HEADER_RE = re.compile(r"^(references?|bibliography)$", re.IGNORECASE)

# Author/year extraction (issue #82): every real-ingested paper hardcoded
# authors=[]/year=None forever, since nothing here ever looked. PDF metadata
# is the first, most reliable pass when a PDF actually carries it; academic
# PDFs from LaTeX/Word toolchains often don't (or the "Author" field is the
# tool itself), so both fall back to a heuristic read of the front-matter
# blocks -- the ones before the first detected section header, where a
# title/byline/copyright line actually lives.
YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")
GENERATOR_AUTHOR_RE = re.compile(r"(LaTeX|Microsoft|Word|Acrobat|PDF|Overleaf)", re.IGNORECASE)
# A byline candidate: 1-4 capitalized words per name (initials, hyphenated
# and apostrophed surnames included), several such names joined by commas/and.
NAME_RE = re.compile(r"^[A-Z][a-zA-Z.\-']*(?:\s+[A-Z][a-zA-Z.\-']*){0,3}$")

# Numeric ledger patterns. The entailment floor (lib/grounding/entail.ts)
# checks every number/unit/comparator in a claim against these, so precision
# here matters more than recall -- a missed number just means a claim can't
# use it, a wrong one could pass a claim it shouldn't.
NUMERIC_PATTERNS = [
    ("p_value", re.compile(r"\bp\s*(?P<cmp><=|>=|<|>|=|~)\s*(?P<val>0?\.\d+)\b", re.IGNORECASE)),
    ("percent", re.compile(r"(?P<val>\d+(?:\.\d+)?)\s*%")),
    ("ci_bound", re.compile(r"95%\s*CI[,:]?\s*[\[\(]?(?P<val>-?\d+(?:\.\d+)?)", re.IGNORECASE)),
    ("sample_size", re.compile(r"\bn\s*=\s*(?P<val>\d{1,7})\b", re.IGNORECASE)),
    ("effect_size", re.compile(r"\b(?:HR|OR|RR)\s*=\s*(?P<val>\d+(?:\.\d+)?)\b")),
]

MIN_CHUNK_WORDS = 350  # ~500 tokens at ~0.7 words/token (plan.md §4.3's 500-800 token target)
MAX_CHUNK_WORDS = 560  # ~800 tokens
OVERLAP_WORDS = 55  # ~80 tokens


def block_text(block):
    return "".join(span["text"] for line in block.get("lines", []) for span in line.get("spans", [])).strip()


def block_font_size(block):
    sizes = [span["size"] for line in block.get("lines", []) for span in line.get("spans", []) if span.get("text", "").strip()]
    return max(sizes) if sizes else 0.0


def is_header(text, size, median_size):
    if not text or len(text) > 90:
        return False
    return bool(HEADER_RE.match(text.strip())) or (median_size > 0 and size >= median_size * 1.25)


def extract_blocks(doc):
    """One entry per text block, page-ordered, each carrying its own bbox."""
    entries = []
    for page_index in range(len(doc)):
        page = doc[page_index]
        raw = page.get_text("dict")
        text_blocks = [b for b in raw.get("blocks", []) if b.get("type") == 0]
        sizes = sorted(s for s in (block_font_size(b) for b in text_blocks) if s > 0)
        median_size = sizes[len(sizes) // 2] if sizes else 0.0

        for block in text_blocks:
            text = block_text(block)
            if not text:
                continue
            entries.append(
                {
                    "page": page_index + 1,
                    "text": text,
                    "bbox": block["bbox"],
                    "is_header": is_header(text, block_font_size(block), median_size),
                }
            )
    return entries


def group_into_sections(entries):
    """Splits the block stream into sections at header blocks. Everything
    before the first detected header becomes an implicit "Front matter"
    section, since a title/abstract page rarely has a header block of its own."""
    sections = [{"title": "Front matter", "blocks": []}]
    for entry in entries:
        if entry["is_header"]:
            sections.append({"title": entry["text"][:120], "blocks": []})
            continue
        sections[-1]["blocks"].append(entry)
    return [s for s in sections if s["blocks"]]


def chunk_section(section_blocks):
    """Greedy word-count windows, ~500-800 tokens with ~80-token overlap,
    never crossing the section boundary the caller already sliced at."""
    words_buffer = [(word, block_index) for block_index, block in enumerate(section_blocks) for word in block["text"].split()]

    chunks = []
    i = 0
    while i < len(words_buffer):
        window = words_buffer[i : i + MAX_CHUNK_WORDS]
        if not window:
            break
        chunks.append(
            {
                "text": " ".join(w for w, _ in window),
                "block_indices": sorted({b for _, b in window}),
            }
        )
        if i + MAX_CHUNK_WORDS >= len(words_buffer):
            break
        i += max(MIN_CHUNK_WORDS - OVERLAP_WORDS, 1)
    return chunks


def extract_numerics(chunk_index, text):
    found = []
    for role, pattern in NUMERIC_PATTERNS:
        for m in pattern.finditer(text):
            try:
                value = float(m.group("val"))
            except (IndexError, ValueError):
                continue
            found.append(
                {
                    "chunkIndex": chunk_index,
                    "rawText": m.group(0),
                    "value": value,
                    "unit": "%" if role == "percent" else None,
                    "comparator": m.groupdict().get("cmp"),
                    "role": role,
                }
            )
    return found


def extract_references(sections):
    for section in sections:
        if not REFERENCES_HEADER_RE.match(section["title"].strip()):
            continue
        full_text = "\n".join(b["text"] for b in section["blocks"])
        # Split on a numbered-entry marker at the start of a line: "[12]" or "12.".
        entries = re.split(r"\n(?=\[?\d{1,3}\]?[.)]\s)", full_text)
        refs = []
        for entry in entries:
            entry = entry.strip()
            if len(entry) < 10:
                continue
            doi_match = re.search(r"10\.\d{4,9}/\S+", entry)
            refs.append({"rawText": entry[:500], "doi": doi_match.group(0).rstrip(".,)") if doi_match else None})
        return refs
    return []


@contextlib.contextmanager
def suppressed_stdout():
    """Redirects the OS-level stdout file descriptor to /dev/null for the
    duration of the block. This script's whole contract is "prints ONE
    JSON document to stdout and nothing else" -- but Pix2Text's own
    dependency stack (Ultralytics' YOLO progress lines, onnxruntime/
    transformers load messages, and something in its transitive imports
    that pulls in the legacy `fitz` compat shim, distinct from this
    file's own `pymupdf as fitz`) writes several kinds of diagnostic
    output directly to the C-level stdout stream, which reassigning
    Python's `sys.stdout` alone would not catch. Only stdout (fd 1) is
    touched -- this file's own stderr diagnostics via `print(...,
    file=sys.stderr)` are unaffected.
    """
    original_fd = os.dup(1)
    devnull_fd = os.open(os.devnull, os.O_WRONLY)
    try:
        os.dup2(devnull_fd, 1)
        yield
    finally:
        os.close(devnull_fd)
        os.dup2(original_fd, 1)
        os.close(original_fd)


def render_page_image(page, dpi=150):
    """Renders a page to a raster at the given DPI, returning the PIL image
    and the zoom factor (DPI/72) needed to convert a bbox measured on that
    raster back into the page's own PDF point-space -- the same space every
    other chunk's `rects` are already in, so highlighting doesn't need a
    special case for equation chunks."""
    zoom = dpi / 72
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    return img, zoom


FIGURE_CAPTION_RE = re.compile(r"^(figure|fig\.?)\s*\d", re.IGNORECASE)


def find_nearby_caption(figure_box, text_elements):
    """The closest text element that reads like a figure caption ("Figure
    2: ..."/"Fig. 2 ..."), preferring one positioned just below the figure
    (the near-universal convention) over one above it, which gets a large
    distance penalty rather than being ruled out outright -- a caption
    Pix2Text placed slightly out of strict reading order is still a better
    answer than no caption at all."""
    _, fy0, _, fy1 = figure_box
    best_text, best_distance = None, None
    for el in text_elements:
        text = (el.text or "").strip()
        if not FIGURE_CAPTION_RE.match(text):
            continue
        _, ey0, _, ey1 = el.box
        distance = (ey0 - fy1) if ey0 >= fy1 else (fy0 - ey1) + 10_000
        if best_distance is None or distance < best_distance:
            best_text, best_distance = text, distance
    return best_text


def extract_equations_and_figures(doc):
    """Issues #59 and #60: equation-kind chunks with real bbox anchoring,
    and real figure crops for the `figures` generator's vision call. One
    Pix2Text (free, open-source, runs entirely locally --
    github.com/breezedeus/Pix2Text) pass per page detects both kinds of
    region and converts/crops accordingly, rather than running the same
    page through the model twice for two different element types.

    Equations: only a *display* equation (its own page element, not a
    symbol inline with prose) becomes a chunk -- Pix2Text merges an inline
    formula into its surrounding paragraph with no reliable sub-bbox to
    anchor to, while a paper's explicitly-numbered display equations are
    also the ones a reader would actually look up by name ("Equation 3").

    Figures: the crop itself is visual context for the vision call, not
    something the deterministic verifier can check on its own -- the real,
    quotable ground truth its evidence cites is the figure's own caption
    text (a figure_caption-kind chunk lib/services/ingest.ts creates from
    `caption` below), found here as the nearest "Figure N"/"Fig. N"-shaped
    text element. A figure with no locatable caption is still returned
    (`caption: None`) rather than dropped -- lib/services/ingest.ts decides
    whether an uncaptioned figure is usable, not this parser.

    Imported lazily, not at module scope: this pulls in torch/onnxruntime
    transitively, real weight either way, but paying it only when actually
    reached means the near-zero-text scanned-PDF check above still fails
    fast without loading a vision model stack it will never use.
    """
    with suppressed_stdout():
        from pix2text import Pix2Text
        from pix2text.page_elements import ElementType

        p2t = Pix2Text.from_config()

    equations = []
    figures = []
    for page_index in range(len(doc)):
        img, zoom = render_page_image(doc[page_index])
        try:
            with suppressed_stdout():
                page_result = p2t.recognize_page(img)
        except Exception as err:  # A page Pix2Text can't process is a skip, not a failed ingest.
            print(f"equation/figure extraction skipped page {page_index + 1}: {err}", file=sys.stderr)
            continue

        text_elements = [el for el in page_result.elements if el.type in (ElementType.TEXT, ElementType.PLAIN_TEXT)]

        for el in page_result.elements:
            text = (el.text or "").strip()

            if el.type == ElementType.FIGURE:
                x0, y0, x1, y1 = el.box
                if x1 <= x0 or y1 <= y0:
                    continue
                buf = io.BytesIO()
                img.crop((x0, y0, x1, y1)).save(buf, format="PNG")
                figures.append(
                    {
                        "page": page_index + 1,
                        "caption": find_nearby_caption(el.box, text_elements),
                        "imageBase64": base64.b64encode(buf.getvalue()).decode("ascii"),
                        "rect": {"page": page_index + 1, "x0": x0 / zoom, "y0": y0 / zoom, "x1": x1 / zoom, "y1": y1 / zoom},
                    }
                )
                continue

            # A display formula reaches here two different ways depending on
            # how Pix2Text's own layout pass grouped the page: either as its
            # own distinct FORMULA-type element (raw LaTeX, no delimiters --
            # observed live), or merged into a TEXT-type paragraph that is
            # otherwise entirely one $$...$$/$...$-wrapped formula and
            # nothing else (also observed live, same PDF, different page).
            # Checking both instead of only the delimiter shape is what
            # makes this reliable rather than tuned to one specific case.
            is_formula_element = el.type == ElementType.FORMULA
            is_wrapped_text = (text.startswith("$$") and text.endswith("$$")) or (
                text.startswith("$") and text.endswith("$") and not text.startswith("$$")
            )
            if not (is_formula_element or is_wrapped_text):
                continue
            latex = text.strip("$").strip()
            if not latex:
                continue
            x0, y0, x1, y1 = el.box
            equations.append(
                {
                    "page": page_index + 1,
                    "text": latex,
                    "rect": {"page": page_index + 1, "x0": x0 / zoom, "y0": y0 / zoom, "x1": x1 / zoom, "y1": y1 / zoom},
                }
            )
    return equations, figures


def extract_year(metadata, front_matter_text):
    """Metadata's creation/mod date first ("D:YYYYMMDD..."), since that's an
    actual timestamp rather than a guess; falls back to the first plausible
    19xx/20xx year mentioned in the front matter (a copyright line or
    conference year usually puts one there) when metadata has none."""
    for key in ("creationDate", "modDate"):
        raw = (metadata or {}).get(key) or ""
        m = re.match(r"D:(\d{4})", raw)
        if m:
            year = int(m.group(1))
            if 1900 <= year <= 2100:
                return year

    m = YEAR_RE.search(front_matter_text)
    return int(m.group(0)) if m else None


def extract_authors(metadata, front_matter_blocks):
    """Metadata's `author` field first, filtered against the common case of
    it actually naming the PDF-producing tool instead of a person; falls
    back to scanning the first few front-matter blocks (title page, before
    Abstract) for a line that reads like a comma/and-separated author list."""
    raw = ((metadata or {}).get("author") or "").strip()
    if raw and not GENERATOR_AUTHOR_RE.search(raw):
        names = [n.strip() for n in re.split(r",|;|\band\b", raw) if n.strip()]
        if names:
            return names

    for block in front_matter_blocks[:8]:
        text = block["text"].strip()
        if not (3 < len(text) < 200):
            continue
        candidates = [c.strip() for c in re.split(r",|;|\band\b", text) if c.strip()]
        if 1 <= len(candidates) <= 12 and all(NAME_RE.match(c) for c in candidates):
            return candidates

    return []


def main():
    if len(sys.argv) < 2:
        print("usage: parse.py <path-to-pdf>", file=sys.stderr)
        sys.exit(2)

    doc = fitz.open(sys.argv[1])
    entries = extract_blocks(doc)

    # Issue #94: a scanned/image-only PDF has no embedded text layer at
    # all -- PyMuPDF's get_text() returns nothing to extract, and this used
    # to just silently produce an empty/near-empty paper, with a generator
    # fan-out over zero chunks and nothing to ever cite. scripts/
    # ocr_fallback.py (PaddleOCR-VL) is still an unwired stub -- a real OCR
    # pass is future work, not something to install as a heavy new
    # dependency inside this fix -- so this is the minimum honest behavior
    # the issue itself calls out as acceptable: fail loudly with a clear
    # diagnosis instead of succeeding with nothing. ~20 chars/page is well
    # below any page of real prose (hundreds to thousands of characters);
    # a genuinely scanned page produces at or near zero.
    MIN_CHARS_PER_PAGE = 20
    total_chars = sum(len(e["text"]) for e in entries)
    if len(doc) > 0 and total_chars < MIN_CHARS_PER_PAGE * len(doc):
        print(
            f"This PDF appears to be scanned or image-only: only {total_chars} characters of "
            f"extractable text were found across {len(doc)} page(s). PyMuPDF reads embedded text "
            "layers, not pixels -- there is no OCR fallback wired up yet, so a scanned PDF can't be "
            "ingested here.",
            file=sys.stderr,
        )
        sys.exit(1)

    sections = group_into_sections(entries)

    out_sections = []
    out_chunks = []
    out_numerics = []

    for section in sections:
        if REFERENCES_HEADER_RE.match(section["title"].strip()):
            continue  # references are parsed separately below, not chunked as prose

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

    # Issues #59 and #60: equation-kind chunks and figure crops, appended
    # after every prose chunk is already built so a nearby prose chunk's
    # sectionIndex can be reused -- both come from a separate page-image
    # pass with no text-based section detection of its own, so "whichever
    # section's prose chunk immediately precedes this page" is the best
    # available section to attribute one to, not a real per-item
    # classification.
    equations, figures = extract_equations_and_figures(doc)

    for equation in equations:
        section_index = 0
        for c in out_chunks:
            if c["page"] <= equation["page"]:
                section_index = c["sectionIndex"]
        chunk_index = len(out_chunks)
        out_chunks.append(
            {
                "page": equation["page"],
                "kind": "equation",
                "text": equation["text"],
                "sectionIndex": section_index,
                "rects": [equation["rect"]],
            }
        )
        out_numerics.extend(extract_numerics(chunk_index, equation["text"]))

    out_figures = []
    for figure in figures:
        section_index = 0
        for c in out_chunks:
            if c["page"] <= figure["page"]:
                section_index = c["sectionIndex"]
        out_figures.append(
            {
                "page": figure["page"],
                "caption": figure["caption"],
                "imageBase64": figure["imageBase64"],
                "sectionIndex": section_index,
                "rect": figure["rect"],
            }
        )

    metadata_title = (doc.metadata or {}).get("title", "").strip() or None
    # Page 1's raw blocks, not the "Front matter" *section* -- a paper's own
    # title is usually the largest font on the page, which is exactly what
    # is_header() also uses to detect a section break, so the byline/
    # copyright/abstract that follows the title routinely ends up nested
    # under a section titled after the paper itself rather than under
    # "Front matter". Reading the flat per-page blocks sidesteps that
    # section-grouping question entirely for what's just a metadata guess.
    page1_blocks = [e for e in entries if e["page"] == 1]
    page1_text = "\n".join(b["text"] for b in page1_blocks)

    json.dump(
        {
            "title": metadata_title,
            "authors": extract_authors(doc.metadata, page1_blocks),
            "year": extract_year(doc.metadata, page1_text),
            "sections": out_sections,
            "chunks": out_chunks,
            "numerics": out_numerics,
            "figures": out_figures,
            "references": extract_references(sections),
            "pageCount": len(doc),
        },
        sys.stdout,
    )


if __name__ == "__main__":
    main()
