// TODO: orchestrates parse (scripts/parse.py via child_process or scripts/seed.ts pattern) -> chunks/sections/figures/
// equations/refs/numerics -> writes job_events for SSE. Triggers PaddleOCR-VL (scripts/ocr_fallback.py) when the
// zero-extractable-text check fires or a page is table/formula-dense.
