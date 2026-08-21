import "server-only";

import { fetchJson } from "./externalFetch";

/**
 * DOI to open-access PDF, via Unpaywall.
 *
 * Issue #236: the upload form offered DOI beside PDF-upload and a direct
 * link, and `lib/services/ingest.ts` created a job for it and immediately
 * failed it with "DOI resolution isn't implemented yet". The failure was
 * honest; offering the path at all was not.
 *
 * Unpaywall is the right resolver here because it is exactly the question
 * being asked -- "is there a legally free PDF of this DOI, and where" -- and
 * it answers with a licence alongside the URL. It is a single unauthenticated
 * GET, but it does require an identifying email as a query parameter (that is
 * the whole of its auth model; requests without one get a 422). So this can
 * only work where UNPAYWALL_EMAIL is configured, and when it is not the
 * caller gets a named reason rather than a generic failure.
 *
 * Only `best_oa_location` is read. `oa_locations` also lists copies Unpaywall
 * has merely seen, including ones on sites hosting them without permission,
 * and this project's own upload copy promises open-access-or-CC. The
 * best-OA-location field is the one Unpaywall vouches for.
 */

interface UnpaywallLocation {
  url_for_pdf: string | null;
  license: string | null;
  host_type: string | null;
}

interface UnpaywallResponse {
  is_oa: boolean;
  best_oa_location: UnpaywallLocation | null;
}

export type DoiResolution =
  | { ok: true; pdfUrl: string; license: string | null }
  | { ok: false; reason: string };

/** Reads the config on each call so a deploy that adds the var takes effect without a rebuild. */
function resolverEmail(): string | null {
  const email = process.env.UNPAYWALL_EMAIL?.trim();
  return email ? email : null;
}

export function isDoiResolverConfigured(): boolean {
  return resolverEmail() !== null;
}

export async function resolveDoiToPdfUrl(doi: string): Promise<DoiResolution> {
  const email = resolverEmail();
  if (!email) {
    return {
      ok: false,
      reason:
        "DOI lookup isn't configured on this deployment. Paste a direct PDF link, or upload the file.",
    };
  }

  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;

  let data: UnpaywallResponse;
  try {
    data = await fetchJson<UnpaywallResponse>(url);
  } catch {
    // Deliberately not distinguishing 404 from a network failure to the
    // caller. Both mean "no PDF from here right now", and the actionable
    // advice is identical.
    return {
      ok: false,
      reason: "Couldn't look that DOI up. Paste a direct PDF link, or upload the file.",
    };
  }

  const pdfUrl = data.is_oa ? data.best_oa_location?.url_for_pdf : null;
  if (!pdfUrl) {
    return {
      ok: false,
      reason:
        "No open-access PDF is available for that DOI. Upload the file if you have access to it.",
    };
  }

  return { ok: true, pdfUrl, license: data.best_oa_location?.license ?? null };
}
