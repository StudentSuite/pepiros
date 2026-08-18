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
import json
import re
import sys

import pymupdf as fitz  # PyMuPDF; `pymupdf` is the current package name, `fitz` the historical import alias

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
            "references": extract_references(sections),
            "pageCount": len(doc),
        },
        sys.stdout,
    )


if __name__ == "__main__":
    main()
