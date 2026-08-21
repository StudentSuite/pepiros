import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { isAdminProfile } from "@/lib/auth/admin";
import { isOpenAccess } from "@/lib/data/papers";
import { getCorpusStats, type CorpusStats } from "@/lib/db/queries";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { buttonClassName } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Admin" };

/**
 * `/admin` (issue #234): everything about the platform in one place.
 *
 * Both /analytics and the dashboard are scoped to the signed-in profile, so
 * before this there was no global view of anything: not how many accounts
 * exist, not how much has actually been ingested, not whether grounding
 * quality holds across the whole corpus rather than one workspace.
 *
 * The corpus counts come straight from Postgres as counts, not by assembling
 * workspaces and measuring them, because a stats page that loads the entire
 * corpus to call `.length` becomes the slowest route on the site.
 *
 * 404, not 403, for a non-admin: a 403 confirms the route exists, and that is
 * exactly what somebody probing for an admin surface is trying to learn.
 */

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Panel padded>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{label}</p>
      <p className="mt-1 font-serif text-2xl text-ink">{value}</p>
      {hint && <p className="mt-0.5 font-sans text-xs text-ink-faint">{hint}</p>}
    </Panel>
  );
}

/**
 * The database may simply not be reachable (no DATABASE_URL in a seed-mode
 * deployment). That is a legitimate state for this page, not an error worth a
 * stack trace: the onboarding half still works, so degrade to a stated
 * "unavailable" rather than failing the whole route.
 */
async function loadCorpusStats(): Promise<CorpusStats | null> {
  try {
    return await getCorpusStats();
  } catch (err) {
    console.error("[admin] getCorpusStats() unavailable:", err);
    return null;
  }
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) notFound();

  const adapter = getAdapter();
  const profile = await adapter.getProfile(session.id);
  if (!isAdminProfile(profile)) notFound();

  const [corpus, responses, catalog] = await Promise.all([
    loadCorpusStats(),
    adapter.listOnboardingResponses(),
    adapter.listCatalog(),
  ]);

  const completed = responses.filter((r) => r.completedAt !== null).length;
  const optedIn = responses.filter((r) => r.contactOptIn).length;
  const withStory = responses.filter((r) => (r.wrongSummaryStory ?? "").trim() !== "").length;
  const indexed = catalog.filter((p) => p.workspaceId).length;

  const located = corpus?.evidenceByTier.find((t) => t.tier === "quote_located")?.count ?? 0;
  const unsupported = corpus?.evidenceByTier.find((t) => t.tier === "unsupported")?.count ?? 0;
  const totalEvidence = corpus?.evidence ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl p-s-5">
      <PageHeader
        title="Admin"
        description={`Everything, across every account. Signed in as @${profile!.username}.`}
      />

      <section className="mb-s-6">
        <h2 className="mb-s-3 font-serif text-xl text-ink">Onboarding</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Responses" value={responses.length} />
          <Stat
            label="Completed"
            value={completed}
            hint={responses.length > 0 ? `${Math.round((completed / responses.length) * 100)}%` : undefined}
          />
          <Stat label="Told us a story" value={withStory} />
          <Stat
            label="Contact opt-in"
            value={optedIn}
            hint={responses.length > 0 ? `${Math.round((optedIn / responses.length) * 100)}%` : undefined}
          />
        </div>
        <Link href="/admin/onboarding" className={buttonClassName("secondary", "sm", "mt-s-3")}>
          Read the answers
        </Link>
      </section>

      <section className="mb-s-6">
        <h2 className="mb-s-3 font-serif text-xl text-ink">Library</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Catalog papers" value={catalog.length} />
          <Stat
            label="Actually indexed"
            value={indexed}
            hint={indexed === 0 ? "scripts/index-catalog.ts has not run" : undefined}
          />
          <Stat
            label="Open access"
            value={catalog.filter((p) => isOpenAccess(p.licence)).length}
            hint="the rest are paywalled or unverified"
          />
          <Stat label="Papers ingested" value={corpus?.papers ?? "n/a"} />
        </div>
      </section>

      <section className="mb-s-6">
        <h2 className="mb-s-3 font-serif text-xl text-ink">Corpus</h2>
        {corpus === null ? (
          <Panel padded>
            <p className="font-sans text-sm text-ink-faint">
              The database is not reachable from this deployment, so corpus counts are
              unavailable. Onboarding figures above come from the data adapter and are
              unaffected.
            </p>
          </Panel>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Workspaces" value={corpus.workspaces} />
            <Stat label="Chunks" value={corpus.chunks} />
            <Stat label="Nodes" value={corpus.nodes} />
            <Stat label="Edges" value={corpus.edges} />
            <Stat label="Evidence rows" value={corpus.evidence} />
            <Stat
              label="Quote located"
              value={located}
              hint={totalEvidence > 0 ? `${Math.round((located / totalEvidence) * 100)}% of evidence` : undefined}
            />
            {/* The drop rate the product talks about, measured across every
                workspace rather than one. Shown only when there is evidence to
                compute it from (issue #282's rule, applied here too). */}
            <Stat
              label="Unsupported"
              value={unsupported}
              hint={totalEvidence > 0 ? `${Math.round((unsupported / totalEvidence) * 100)}% drop rate` : undefined}
            />
            <Stat label="Conversations" value={corpus.conversations} />
          </div>
        )}
      </section>

      {corpus !== null && (
        <section>
          <h2 className="mb-s-3 font-serif text-xl text-ink">Ingest jobs</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Jobs run" value={corpus.jobs} />
            <Stat
              label="Failed"
              value={corpus.jobsFailed}
              hint={corpus.jobs > 0 ? `${Math.round((corpus.jobsFailed / corpus.jobs) * 100)}%` : undefined}
            />
          </div>
        </section>
      )}
    </div>
  );
}
