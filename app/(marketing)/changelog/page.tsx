import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { CHANGELOG } from "@/lib/data/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What changed in Pepiros, newest first.",
};

export default function ChangelogPage() {
  return (
    <LegalPage
      kicker="Changelog"
      title="What changed"
      intro="Newest first. Early-build pace, so entries are grouped by day rather than by release."
    >
      {CHANGELOG.map((e) => (
        <section key={e.date}>
          <div className="flex items-baseline gap-s-3">
            <span className="font-mono text-2xs text-ink-faint">{e.date}</span>
            <h2 className="font-sans font-semibold text-lg text-ink">{e.title}</h2>
          </div>
          <ul className="mt-s-3 ml-s-4 list-disc space-y-s-2 font-sans text-sm leading-relaxed text-ink-muted">
            {e.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </section>
      ))}
    </LegalPage>
  );
}
