# Anti-slop checklist

Read before building any of phases 4-7. Anay's own words after the first
homepage pass: "it looks very shit... should scream ai." This is the list of
why, plus what this repo does instead. Applies to every phase, not just the
homepage.

## The tells, and what to do instead here

**Blue-to-purple gradient hero, or gradients everywhere.**
The mesh-drift shader is a bookend, not the page's default surface. Use
`<Band>` for the hero and the closing CTA only. A mid-page section that wants
visual weight gets a `<DispersionGlow>` (a small blurred colour wash) or a
tinted accent border, not a full gradient background. If more than two bands
on one page carry the shader, that's the tell -- pull it back to a plain
section (`bg-surface`, ordinary `--ink` text).

**Inter, or any default sans, anywhere.** This repo's `--font-grotesque` is
Geist (`app/layout.tsx`), not Inter. `font-sans` in any `className` resolves
to Geist already -- never hardcode a font-family or reach for a different
Google Font. `--font-serif` (Source Serif 4) is for long-form article body
copy only, never headings, never the wordmark, never UI chrome.

**`rounded-2xl` (or any bare Tailwind radius).** This repo's radius scale is
tokens: `rounded-sm/md/lg/xl` map to `--r-sm/md/lg/xl` (6/10/14/20px) in
`tailwind.config.ts`, and `rounded-full` is the pill. A raw `rounded-2xl` (or
any radius not in that list) isn't wired to a token and is a tell on its own
-- grep for it before committing.

**Three-card feature grids.** Three real facts existing is not, on its own, a
reason to draw three identical bordered boxes with an icon-in-a-circle each.
`components/site/CapabilityCards.tsx` was rebuilt from that shape into one
flowing row divided by hairlines specifically because of this -- same three
facts, no card chrome pretending each is an independent module. If a block
has 3 of something, ask whether it needs to look like 3 separate cards before
building it that way.

**Pricing table with a glowing "Most Popular" tier.** N/A, no pricing page in
this product. Don't invent one.

**Stock testimonial avatars / generic smiling faces.** Already handled: the
plan's own §6.1 replaces Cohere's testimonial slot with "the evidence
guarantee" (a real product claim, `ReaderMock` showing a real located quote)
specifically because this product has no honest testimonial content. Same
reasoning applies anywhere else a "what people say" slot might tempt one in
-- don't build it, replace it with something checkable.

**Fade-up scroll animation on nearly every element.** `<Reveal>` exists and
is fine, but wrapping every section in it is the tell, not the component
itself. Use it on ONE OR TWO sections per page where a scroll reveal earns
its keep (the first real product screenshot, the page's actual argument) --
everything else renders plainly, present on first paint. If more than ~20%
of a page's sections are wrapped in `<Reveal>`, that's too many.

**Generic headlines ("Transform how you work", "Unlock your potential").**
Every headline on this page states a specific, checkable fact about this
specific product ("Every claim, one click from its text.", "We do not say
verified. We show you where it says it."). If a headline would still be true
with the product name swapped for a competitor's, rewrite it.

**Em dashes.** `npm run check:no-em-dashes` already fails CI on this. Don't
work around it.

**Sticky blurred navbar.** Judgment call, not blanket-banned here: `SiteHeader`
is sticky with a backdrop blur, same as GitHub, Linear, Stripe, Notion. That
reads as ordinary product-app navigation, not decoration, and dropping it
would cost real usability on long pages (discover, paper detail, docs). Kept
deliberately. Flag it if a reviewer disagrees, but don't remove it by default
just because it's on this list.

## Also, from building phases 0-3

**Text over a moving background needs a scrim, verified against the
background's LIGHTEST possible frame, not whatever frame a screenshot
happened to catch.** The mesh-drift shader legitimately cycles through its
own near-white stop (`#F0E6D8`) at any point on screen. `<Band>` white text
went briefly invisible in an early pass because contrast was eyeballed
against one screenshot rather than computed against the worst case. `Band.tsx`
now carries a scrim (`bg-[#0E0A14]/60`, computed to ~5.6:1 against the
palette's lightest stop) so this can't recur -- don't build a second raw
shader-band text treatment without one.

**A pure function inside a `"use client"` file becomes uncallable from a
Server Component**, even with zero hooks or browser APIs in it (the whole
module inherits the boundary). `bandButtonClassName` hit this and got split
into its own client-free file (`components/chrome/band-button.ts`). If a
"why can't the server call this" error shows up, check for this before
anything else.

**Verify by actually looking, not just by `tsc`/`eslint` passing.** Every bug
above passed typecheck and lint clean. They were caught by opening the
rendered page in a browser, scrolling it for real (not a one-shot `fullPage`
screenshot -- `<Reveal>`'s IntersectionObserver never fires for content that
was never actually scrolled into a real viewport, which reads as a "black
void" bug that isn't one), and reading the actual pixels of generated
assets, not just checking that a script exited 0.

## Where this doc lives

`design/anti-slop.md`, next to the brand kit and token lab it keeps company
with. Update it when a new tell gets caught, the same way this list grew out
of catching the first six.
