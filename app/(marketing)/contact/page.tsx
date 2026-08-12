import { Reveal } from "@/components/ui/Reveal";

/**
 * `/contact` -- deliberately small: a heading, one paragraph, and a
 * placeholder line instead of a `mailto:` link. No contact address is
 * referenced anywhere in the repo (README.md, SECURITY.md, CONTRIBUTING.md,
 * CODE_OF_CONDUCT.md, package.json all checked), so this follows the
 * brief's fallback literally rather than inventing one. Header/footer come
 * from app/(marketing)/layout.tsx.
 */
export default function ContactPage() {
  return (
    <main className="flex flex-col">
      {/* Banner header. Not wrapped in Reveal -- first thing on screen. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-14 pt-20 sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Contact</p>
        <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
          There&apos;s no inbox yet.
        </h1>
        <p className="max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
          Pepiros is a two-person hackathon build, Anay Dhawan and Yash Kewlani, not a support
          desk. There&apos;s no dedicated contact address set up yet, so this page carries a
          placeholder rather than one made up on the spot.
        </p>
      </section>

      {/* Placeholder, plain text, deliberately not a mailto: link. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-16">
            <p className="font-mono text-sm text-ink-faint opacity-60" aria-disabled="true">
              Contact: coming soon
            </p>
            <p className="mt-6 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              For a bug, open a GitHub issue once the repository is public. For a security report,
              see the private disclosure flow described in SECURITY.md.
            </p>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
