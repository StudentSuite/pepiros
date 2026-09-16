# Paraphrase fixture

`paraphrase-pairs.json` (gitignored, not `paraphrase-pairs.example.json`) is
what `scripts/measure-paraphrase.ts` reads for issue #410.

Needs 8-10 pairs, each a sentence that:

- paraphrases a real source passage (not quotes it directly)
- is correctly cited against that passage
- comes from an actual Extended Essay draft, not a synthetic example

Each pair is `{ id, sentence, sourceText }`, with `sourceText` copied
verbatim from the paper being cited. See `paraphrase-pairs.example.json`
for the shape.

Run against it:

```bash
npx tsx scripts/measure-paraphrase.ts
```
