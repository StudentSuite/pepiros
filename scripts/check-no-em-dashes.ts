// House rule (see CONTRIBUTING.md): no em dashes (U+2014) anywhere in this
// project's own authored text -- comments, docs, UI copy, commit-adjacent
// files. Use a comma, colon, semicolon, or a double-hyphen (" -- ", this
// codebase's own convention) instead. Run with `npm run check:no-em-dashes`;
// wired into CI so a stray em dash fails the build instead of drifting back
// in unnoticed.
//
// The banned character is written below as an escape, not a literal glyph:
// git ls-files includes this script's own source, and a literal em dash in
// EM_DASH's initializer would be indistinguishable from the prose this rule
// is meant to catch, making the check fail on itself.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EM_DASH = "\u2014";

// Binary or vendored-format files git tracks that a text scan has no business
// opening -- a lockfile's generated content isn't this project's prose, and
// these extensions occasionally contain arbitrary bytes that aren't valid
// UTF-8 at all.
const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".otf",
  ".pdf", ".zip", ".svg",
]);
const SKIP_FILES = new Set([
  "package-lock.json",
  // dc-runtime's own compiled bundle (design/capsules/*.dc.html are the
  // token-lab/brand-kit capsules; support.js is their shared runtime). Its
  // own header says "GENERATED ... do not edit" -- it is vendored, not this
  // project's prose, same reasoning as the Next.js generated block below.
  "design/capsules/support.js",
  // Sync notes written by the external design tool that produced
  // design/brand/, not hand-authored by this project. Every other file this
  // project actually wrote under design/ (README.txt, anti-slop.md, the
  // .dc.html capsules themselves) is already clean and stays checked.
  "design/github.md",
]);

/**
 * node_modules/next/dist/server/lib/generate-agent-files.js re-writes this
 * exact block into CLAUDE.md on every `next dev` run (see its own doc
 * comment in CLAUDE.md) -- it is Next.js's own vendored template text, not
 * this project's authored prose, and re-appears verbatim (em dashes
 * included) the moment anyone runs the dev server again. Enforcing the house
 * rule on text this project doesn't control would make the check
 * permanently, unfixably red.
 */
const GENERATED_BLOCK_START = "<!-- BEGIN:nextjs-agent-rules -->";
const GENERATED_BLOCK_END = "<!-- END:nextjs-agent-rules -->";

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { encoding: "utf-8" }).split("\n").filter(Boolean);
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot).toLowerCase();
}

interface Hit {
  file: string;
  line: number;
  text: string;
}

function findEmDashes(): Hit[] {
  const hits: Hit[] = [];
  for (const file of trackedFiles()) {
    if (SKIP_FILES.has(file) || SKIP_EXTENSIONS.has(extensionOf(file))) continue;

    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue; // Deleted-but-still-staged, a submodule pointer, or genuinely not text -- not this check's job.
    }
    if (!content.includes(EM_DASH)) continue;

    // Scanned line-by-line, tracking generated-block membership per line
    // (rather than slicing the block out of `content` first), so a hit's
    // reported line number always matches the real file on disk.
    let inGeneratedBlock = false;
    content.split("\n").forEach((lineText, i) => {
      if (lineText.includes(GENERATED_BLOCK_START)) inGeneratedBlock = true;
      const skip = inGeneratedBlock;
      if (lineText.includes(GENERATED_BLOCK_END)) inGeneratedBlock = false;

      if (!skip && lineText.includes(EM_DASH)) {
        hits.push({ file, line: i + 1, text: lineText.trim() });
      }
    });
  }
  return hits;
}

const hits = findEmDashes();
if (hits.length > 0) {
  console.error(`Found ${hits.length} em dash(es) -- replace with a comma, colon, semicolon, or " -- ":\n`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line}: ${hit.text}`);
  }
  process.exit(1);
}
console.log("No em dashes found.");
