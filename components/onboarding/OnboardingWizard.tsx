"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Progress } from "@/components/shadcn/progress";
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
} from "@/lib/data/types";
import { cn } from "@/lib/utils";

/**
 * Seven-step onboarding.
 *
 * Each step is URL-addressable (/onboarding/1 … /onboarding/7) rather than
 * held in local state, which is what the old /welcome flow did. That means a
 * refresh does not throw someone back to the start, and a half-finished wizard
 * can be linked to or resumed.
 *
 * Every question here feeds something real. Fields and intent drive what the
 * reader-first home surfaces first; the agent step ends on MCP token
 * generation, which is the one feature with working backend code behind it.
 * Nothing is asked purely to fill a survey table.
 */

const STEP_COUNT = 7;

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
      await onComplete(isFinal ? { ...draft, completedAt: new Date().toISOString().slice(0, 10) } : draft);
      if (isFinal) {
        router.push("/home");
        router.refresh();
      } else {
        router.push(`/onboarding/${step + 1}`);
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
      await onComplete(draft);
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

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col justify-center p-s-5">
      <Logo size="md" />

      <div className="mt-s-5 flex items-center gap-s-3">
        <Progress value={(step / STEP_COUNT) * 100} className="h-1.5" />
        <span className="shrink-0 font-mono text-[11px] text-ink-faint">
          {step} / {STEP_COUNT}
        </span>
      </div>

      <Card className="mt-s-4 border-border bg-card p-s-6">
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
                        ? "border-accent bg-accent text-white"
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
                        ? "border-accent bg-accent text-white"
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
      </Card>

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
      <h1 className="font-serif text-xl leading-snug text-ink">{title}</h1>
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
              {active && <Check className="size-2.5 text-white" strokeWidth={3} />}
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
