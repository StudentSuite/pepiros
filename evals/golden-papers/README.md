# Golden papers

Drop real PDFs here to run `scripts/measure-drop-rate.ts` against them. This
directory is gitignored for `.pdf` files (same convention as
`fixtures/*.pdf`) -- nothing here is committed to the repo.

Per plan.md §16.1 / §4.5: **never quote a drop-rate number on stage that has
not been measured.** Before demo day, populate this directory with 10 real
biomedical PDFs (the product's fixture and framing both skew clinical/
biomedical, so the measurement should too) and run:

```bash
npx tsx --env-file=.env --conditions=react-server scripts/measure-drop-rate.ts
```

This runs the real parse -> generate -> verify pipeline against every PDF
here and reports the aggregate dropped-anchor rate, hallucinated-ref count,
numeric-floor failures, and a per-generator breakdown (flagging any
generator whose drop rate is above 10%, per §16.1's own troubleshooting
table). A JSON snapshot is written to `evals/results/` (also gitignored) for
comparing runs over time.

Needs `GROQ_API_KEY` or `FEATHERLESS_API_KEY` set, and costs real model
calls proportional to how many papers you put here -- this is a real
measurement, not a fixture.
