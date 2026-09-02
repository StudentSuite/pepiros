"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Progress } from "@/components/shadcn/progress";
import { Band } from "@/components/chrome/Band";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shadcn/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { Logo } from "@/components/ui/Logo";
import { COUNTRIES } from "@/lib/data/countries";
import { RESEARCH_FIELDS } from "@/lib/data/types";
import type {
  AgentTool,
  ExperienceLevel,
  OnboardingResponse,
  ReadingIntent,
  ReferralSource,
  ResearchField,
  Role,
  VerifyMethod,
} from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * Ten-step onboarding.
 *
 * Each step is URL-addressable (/onboarding/1 ... /onboarding/10) rather than
 * held in local state, which is what the old /welcome flow did. That means a
 * refresh does not throw someone back to the start, and a half-finished wizard
 * can be linked to or resumed.
 *
 * Every question here feeds something real. Fields and intent drive what the
 * reader-first home surfaces first; the agent step ends on MCP token
 * generation, which is the one feature with working backend code behind it.
 * Nothing is asked purely to fill a survey table.
 *
 * Steps 1-7 are segmentation and drive personalisation. Steps 8-10 (issue
 * #233) are the opposite: free text about what actually went wrong, what the
 * reader does today to check a claim, and a contact opt-in. They sit last on
 * purpose, so that drop-off lands on them rather than on the answers the home
 * surface depends on. All of them are skippable, like every other step.
 */

/**
 * Issue #233: was 7. Steps 8-10 capture what the reader actually experienced
 * rather than which bucket they fall into, and sit after every question that
 * drives personalisation so drop-off lands on the new ones.
 */
const STEP_COUNT = 10;

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "grad_student", label: "Grad student", hint: "Coursework, a thesis, or a lit review" },
  { value: "researcher", label: "Researcher", hint: "Publishing, reviewing, or supervising" },
  { value: "clinician", label: "Clinician", hint: "Deciding whether findings change practice" },
  { value: "educator", label: "Educator", hint: "Teaching from papers" },
  { value: "engineer", label: "Engineer", hint: "Building on top of published work" },
  { value: "curious_reader", label: "Curious reader", hint: "Reading outside a formal role" },
];

const REFERRALS: { value: ReferralSource; label: string }[] = [
  { value: "reddit", label: "Reddit" },
  { value: "x", label: "X" },
  { value: "github", label: "GitHub" },
  { value: "friend", label: "A friend or colleague" },
  { value: "search", label: "Search" },
  { value: "other", label: "Somewhere else" },
];

const INTENTS: { value: ReadingIntent; label: string; hint: string }[] = [
  { value: "keep_up", label: "Keep up with a field", hint: "Regular reading, broad coverage" },
  { value: "verify_before_citing", label: "Verify claims before citing", hint: "Check what a paper actually says" },
  { value: "lit_review", label: "Prepare a literature review", hint: "Compare many papers at once" },
  { value: "teach", label: "Teach from papers", hint: "Turn findings into material" },
  { value: "connect_agent", label: "Connect an AI agent", hint: "Ground an agent over MCP" },
];

const EXPERIENCE: { value: ExperienceLevel; label: string }[] = [
  { value: "first_papers", label: "These are my first papers" },
  { value: "few_a_month", label: "A few a month" },
  { value: "weekly", label: "Weekly" },
  { value: "its_my_job", label: "It is my job" },
];

const AGENTS: { value: AgentTool; label: string }[] = [
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
  { value: "cursor", label: "Cursor" },
  { value: "none", label: "None of these" },
];

const MAX_FIELDS = 3;

const VERIFY_OPTIONS: { value: VerifyMethod; label: string }[] = [
  { value: "open_pdf_and_search", label: "Open the PDF and search for it" },
  { value: "trust_and_move_on", label: "Trust the summary and move on" },
  { value: "ask_a_colleague", label: "Ask a colleague" },
  { value: "check_cited_source", label: "Check the cited source" },
  { value: "reread_section", label: "Re-read the whole section" },
  { value: "other", label: "Something else" },
];

export function OnboardingWizard({
  step,
  initial,
  onComplete,
}: {
  step: number;
  initial: OnboardingResponse;
  onComplete: (response: OnboardingResponse) => Promise<void>;
}) {
  const router = useRouter();
  // Named `nextDest`, not `next`: the step-advance handler below is already
  // called next(), and so is a local inside the field-cap reducer.
  const nextDest = useSearchParams().get("next") || "";
  const [draft, setDraft] = useState<OnboardingResponse>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof OnboardingResponse>(k: K, v: OnboardingResponse[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  function toggleField(field: ResearchField) {
    setDraft((d) => {
      const has = d.fields.includes(field);
      if (has) return { ...d, fields: d.fields.filter((f) => f !== field) };
      // capped rather than disabled: a full list with dead tiles reads as
      // broken, so the oldest choice drops out to make room
      const next = d.fields.length >= MAX_FIELDS ? d.fields.slice(1) : d.fields;
      return { ...d, fields: [...next, field] };
    });
  }

  function toggleVerifyMethod(method: VerifyMethod) {
    setDraft((d) => ({
      ...d,
      verifyMethod: d.verifyMethod.includes(method)
        ? d.verifyMethod.filter((m) => m !== method)
        : [...d.verifyMethod, method],
    }));
  }

  function toggleAgent(tool: AgentTool) {
    setDraft((d) => {
      if (tool === "none") return { ...d, agentTools: ["none"] };
      const without = d.agentTools.filter((t) => t !== "none");
      return without.includes(tool)
        ? { ...d, agentTools: without.filter((t) => t !== tool) }
        : { ...d, agentTools: [...without, tool] };
    });
  }

  // Issue #201: this used to only persist via onComplete() on the final
  // step -- every earlier step was a bare router.push with the draft held
  // only in this component's local state. Since /onboarding/N is a fresh
  // server-rendered page that re-fetches the (still-empty) saved answers as
  // `initial`, a refresh or back/forward navigation on any step before the
  // last silently discarded every prior answer, contradicting this file's
  // own doc comment that "a half-finished wizard can be linked to or
  // resumed." Now every step-advancing/back action saves the draft so-far.
  async function next() {
    setSaving(true);
    try {
      const isFinal = step === STEP_COUNT;
      // Issue #252: saved regardless of whether this step's own field got
      // filled in (every question is skippable), so drop-off is measured by
      // how far someone actually walked, not by which fields happen to be
      // non-null.
      const furthestStep = Math.max(draft.furthestStep, step);
      await onComplete(
        isFinal
          ? { ...draft, furthestStep, completedAt: new Date().toISOString().slice(0, 10) }
          : { ...draft, furthestStep },
      );
      if (isFinal) {
        // Issue #256: this always finished on /home, so somebody who followed
        // a link to a protected page, created an account, and completed
        // onboarding arrived somewhere they never asked for. /home stays the
        // fallback when there is no destination to return to.
        router.push(nextDest || "/home");
        router.refresh();
      } else {
        // The destination rides along step to step, so it survives a back
        // button or a resumed half-finished wizard.
        router.push(
          nextDest
            ? `/onboarding/${step + 1}?next=${encodeURIComponent(nextDest)}`
            : `/onboarding/${step + 1}`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your answers. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function back() {
    setSaving(true);
    try {
      await onComplete({ ...draft, furthestStep: Math.max(draft.furthestStep, step) });
      router.push(`/onboarding/${step - 1}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your answers. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // Every step is skippable. None of these answers gate access, and forcing a
  // survey before someone can look at the product is a good way to lose them.
  const canAdvance = true;

  // Issue #305: everything the wizard has shown across all ten steps is
  // chrome-free by design -- kept that way deliberately, this is the one
  // surface in the app correct to leave mostly alone. The one exception the
  // plan asks for: the final step gets a full shader Band as a one-time
  // reward rather than a running theme through the wizard, so this content
  // is pulled out once and rendered inside whichever wrapper matches the
  // current step instead of duplicating all ten step blocks per wrapper.
  const stepBody = (
    <>
        {step === 1 && (
          <Step title="Where are you based?" hint="Used only to understand who Pepiros reaches.">
            <CountryCombobox value={draft.country} onChange={(v) => set("country", v)} />
          </Step>
        )}

        {step === 2 && (
          <Step title="How did you hear about Pepiros?">
            <Choices
              options={REFERRALS}
              selected={draft.referralSource}
              onSelect={(v) => set("referralSource", v)}
            />
            {draft.referralSource === "other" && (
              <Input
                value={draft.referralOther ?? ""}
                onChange={(e) => set("referralOther", e.target.value)}
                placeholder="Where, roughly?"
                className="mt-s-3"
              />
            )}
          </Step>
        )}

        {step === 3 && (
          <Step title="What best describes you?">
            <Choices
              options={ROLES}
              selected={draft.role}
              onSelect={(v) => set("role", v)}
            />
          </Step>
        )}

        {step === 4 && (
          <Step
            title="Pick up to three fields."
            hint="These decide what your home page surfaces first."
          >
            <div className="flex flex-wrap gap-s-2">
              {RESEARCH_FIELDS.map((field) => {
                const active = draft.fields.includes(field);
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => toggleField(field)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-s-3 py-1.5 font-sans text-xs transition-colors duration-fast ease-out",
                      active
                        ? "border-accent bg-accent text-paper"
                        : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
                    )}
                  >
                    {field}
                  </button>
                );
              })}
            </div>
            <p className="mt-s-3 font-mono text-[11px] text-ink-faint">
              {draft.fields.length} of {MAX_FIELDS} selected
            </p>
          </Step>
        )}

        {step === 5 && (
          <Step title="What do you want out of Pepiros?">
            <Choices
              options={INTENTS}
              selected={draft.intent}
              onSelect={(v) => set("intent", v)}
            />
          </Step>
        )}

        {step === 6 && (
          <Step title="How much research reading do you do?">
            <Choices
              options={EXPERIENCE}
              selected={draft.experience}
              onSelect={(v) => set("experience", v)}
            />
          </Step>
        )}

        {step === 7 && (
          <Step
            title="Do you use any of these?"
            hint="Pepiros connects over MCP so an agent can check its own claims against a source."
          >
            <div className="flex flex-wrap gap-s-2">
              {AGENTS.map((a) => {
                const active = draft.agentTools.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => toggleAgent(a.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-s-3 py-1.5 font-sans text-xs transition-colors duration-fast ease-out",
                      active
                        ? "border-accent bg-accent text-paper"
                        : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
                    )}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </Step>
        )}

        {step === 8 && (
          <Step
            title="When did an AI summary of a paper last get something wrong in a way that mattered?"
            hint="Skip if it hasn't. One or two sentences is plenty."
          >
            <textarea
              value={draft.wrongSummaryStory ?? ""}
              onChange={(e) => set("wrongSummaryStory", e.target.value || null)}
              rows={5}
              placeholder="It said the trial found an effect. It didn't."
              className={cn(
                "w-full resize-y rounded-md border border-border bg-surface p-s-3",
                "font-serif text-[15px] leading-relaxed text-ink placeholder:text-ink-faint",
                "focus-visible:border-accent focus-visible:outline-none",
              )}
            />
          </Step>
        )}

        {step === 9 && (
          <Step
            title="When you need to know whether a paper actually says something, what do you do now?"
            hint="Pick as many as apply."
          >
            <div className="flex flex-col gap-s-2">
              {VERIFY_OPTIONS.map((option) => {
                const active = draft.verifyMethod.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleVerifyMethod(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-md border px-s-3 py-s-2 text-left font-sans text-sm transition-colors duration-fast ease-out",
                      active
                        ? "border-accent bg-accent-wash text-ink"
                        : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {/* Only asked once "Something else" is actually chosen: a free-text
                box that is always visible reads as a required field. */}
            {draft.verifyMethod.includes("other") && (
              <Input
                value={draft.verifyMethodOther ?? ""}
                onChange={(e) => set("verifyMethodOther", e.target.value || null)}
                placeholder="What do you do?"
                className="mt-s-3"
              />
            )}
          </Step>
        )}

        {step === 10 && (
          <Step
            title="Can we email you about what you're reading?"
            hint="Occasional, from a person, never a newsletter. Unsubscribe any time."
          >
            <label className="flex items-start gap-s-3">
              {/* Unchecked unless actively turned on. A pre-ticked consent box
                  is not consent. */}
              <input
                type="checkbox"
                checked={draft.contactOptIn}
                onChange={(e) => set("contactOptIn", e.target.checked)}
                className="mt-1 size-4 accent-accent"
              />
              <span className="font-sans text-sm leading-relaxed text-ink-muted">
                Yes, you can email me. An administrator can read the answers on
                this and the previous two screens, including anything written in
                your own words; see the{" "}
                <a
                  href="/privacy"
                  className="text-accent-text underline underline-offset-2"
                >
                  privacy page
                </a>
                .
              </span>
            </label>

            <div className="mt-s-5 flex flex-col gap-s-2">
              <label className="font-sans text-sm text-ink-muted" htmlFor="field-freetext">
                {/* Issue #319: hardcoded "six" went stale when RESEARCH_FIELDS
                    grew to its current length -- reading the array's own
                    length here means this can't happen again. */}
                What do you actually work on? The {RESEARCH_FIELDS.length} buckets earlier are broad.
              </label>
              <Input
                id="field-freetext"
                value={draft.fieldFreetext ?? ""}
                onChange={(e) => set("fieldFreetext", e.target.value || null)}
                placeholder="sleep and circadian neuroscience"
              />
            </div>

            <div className="mt-s-4 flex flex-col gap-s-2">
              <label className="font-sans text-sm text-ink-muted" htmlFor="weekly-trigger">
                What would make you use this weekly?
              </label>
              <Input
                id="weekly-trigger"
                value={draft.weeklyTrigger ?? ""}
                onChange={(e) => set("weeklyTrigger", e.target.value || null)}
                placeholder="If it caught a bad citation before I sent a draft out."
              />
            </div>
          </Step>
        )}

        <div className="mt-s-6 flex items-center gap-s-3">
          {step > 1 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => void back()}
              className="gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </Button>
          )}
          <Button onClick={next} disabled={!canAdvance || saving} className="ml-auto gap-1.5">
            {step === STEP_COUNT ? (saving ? "Finishing…" : "Finish") : "Continue"}
            {step < STEP_COUNT && <ArrowRight className="size-3.5" />}
          </Button>
        </div>
    </>
  );

  return (
    <div className="mx-auto flex min-h-[var(--centered-page-min-h)] w-full max-w-xl flex-col justify-center p-s-5">
      <Logo size="md" />

      <div className="mt-s-5 flex items-center gap-s-3">
        <Progress value={(step / STEP_COUNT) * 100} className="h-1.5" />
        <span className="shrink-0 font-mono text-[11px] text-ink-faint">
          {step} / {STEP_COUNT}
        </span>
      </div>

      {step === STEP_COUNT ? (
        // A generous shader margin around a fully opaque inner panel, not
        // `.glass`: shadcn's <Input> is bg-transparent, so it would inherit
        // whatever sits behind it, and `.glass`'s own background is
        // theme-aware (light and translucent in light mode) while this
        // Band's variant="dark" sets reversed (light) text unconditionally
        // -- combining the two risks exactly the contrast bug design/
        // anti-slop.md warns about. bg-surface + an explicit text-ink reset
        // keeps every field here exactly as legible as every other step,
        // regardless of theme or where the shader's motion currently is.
        <Band as="div" variant="dark" className="mt-s-4 rounded-lg p-s-6">
          <div className="rounded-md bg-surface p-s-6 text-ink">{stepBody}</div>
        </Band>
      ) : (
        <Card className="mt-s-4 border-border bg-card p-s-6">{stepBody}</Card>
      )}

      <button
        type="button"
        onClick={() => router.push("/home")}
        className="mx-auto mt-s-4 font-sans text-xs text-ink-faint underline underline-offset-2 hover:text-ink"
      >
        Skip for now
      </button>
    </div>
  );
}

function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="font-sans font-bold text-xl leading-snug text-ink">{title}</h1>
      {hint && <p className="mt-s-2 font-sans text-sm text-ink-muted">{hint}</p>}
      <div className="mt-s-5">{children}</div>
    </div>
  );
}

function Choices<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly { value: T; label: string; hint?: string }[];
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-s-2">
      {options.map((o) => {
        const active = selected === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-s-3 rounded-md border px-s-3 py-s-3 text-left transition-colors duration-fast ease-out",
              active
                ? "border-accent bg-accent-wash"
                : "border-border hover:border-border-strong",
            )}
          >
            <span
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border",
                active ? "border-accent bg-accent" : "border-border-strong",
              )}
            >
              {active && <Check className="size-2.5 text-paper" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block font-sans text-sm text-ink">{o.label}</span>
              {o.hint && (
                <span className="block font-sans text-xs text-ink-faint">{o.hint}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CountryCombobox({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-sans"
        >
          {value ?? "Select a country"}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search countries" />
          <CommandList>
            <CommandEmpty>No country matches that.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c}
                  value={c}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("size-3.5", value === c ? "opacity-100" : "opacity-0")}
                  />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
