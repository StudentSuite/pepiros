-- Private Storage bucket for ingested PDFs (issue #278).
--
-- Ingest used to write parsed PDFs to `process.cwd()/data/pdfs` and the
-- reader's PDF route read back from the same local path, so a paper ingested
-- on a laptop had its graph in Postgres (shared, visible from production) and
-- its PDF only on that laptop. getPaperPdfBytes() therefore always returned
-- null on the hosted site, PdfPane always fell back to MockPdfPane, and the
-- mock flows chunk text as HTML while highlights are drawn at PDF point-space
-- coordinates: two unrelated coordinate systems, which is why a highlight
-- landed on the wrong words or on blank space.
--
-- PUBLIC = FALSE, deliberately. An uploaded paper is not ours to publish, and
-- docs/PLAN-V1.md 22.2 commits to uploads staying private to the uploader's
-- workspace unless the licence permits listing them. Reads go through
-- GET /api/papers/[paperId]/pdf, which resolves the paper via fetchWorkspace()
-- and streams the bytes with the service-role key server-side. No RLS policies
-- are added here because no anon or authenticated client ever touches this
-- bucket directly; the service role bypasses RLS by design, and adding a
-- permissive policy would only widen access beyond the API route.

INSERT INTO storage.buckets (id, name, public)
VALUES ('papers', 'papers', false)
ON CONFLICT (id) DO NOTHING;
