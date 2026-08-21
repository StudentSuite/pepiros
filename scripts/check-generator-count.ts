/**
 * Fails the build if a documented generator count has drifted from the
 * directory (issue #230).
 *
 * README claimed "6 of the 21 node generators" in one place and "20 of the
 * ~22 real types are implemented" in another, and the upload page claimed
 * "6 of 21", while lib/agents/generators/ held a third number. Three
 * hand-maintained copies of one fact drift, and the drift is invisible
 * because nothing reads them.
 *
 * The directory is the source of truth, so this counts it and checks every
 * surface that quotes a number against it. Same idea as the MCP tool count
 * being read from lib/mcp/registry.ts rather than retyped.
 *
 * Run by `npm run check:generator-count`, alongside check:no-em-dashes.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const GENERATORS_DIR = path.join(process.cwd(), "lib", "agents", "generators");

/**
 * `index` is the registry, `runGenerator` is the shared runner, and `custom`
 * is a user-supplied-prompt slot rather than one of the plan's own types, so
 * none of the three is a generator in the sense these counts mean.
 */
const NOT_A_GENERATOR = new Set(["index", "runGenerator", "custom"]);

function countGenerators(): number {
  return readdirSync(GENERATORS_DIR).filter((file) => {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) return false;
    return !NOT_A_GENERATOR.has(file.replace(/\.ts$/, ""));
  }).length;
}

/**
 * Each surface that states the count, with a pattern capturing the number it
 * claims. Adding a new claim without adding it here is the failure mode this
 * cannot catch, which is why the patterns are broad rather than exact.
 */
const CLAIMS: { file: string; pattern: RegExp; label: string }[] = [
  {
    file: "README.md",
    pattern: /(\d+) of the 22 node generators/,
    label: "README generator list",
  },
  {
    file: "README.md",
    pattern: /(\d+) of the ~22 real types in/,
    label: "README 'Not built yet' table",
  },
  {
    file: path.join("app", "(platform)", "upload", "UploadForm.tsx"),
    pattern: /(\d+) of 22 generator types/,
    label: "upload page 'what happens to your file'",
  },
];

const actual = countGenerators();
const failures: string[] = [];

for (const claim of CLAIMS) {
  const source = readFileSync(path.join(process.cwd(), claim.file), "utf8");
  const match = source.match(claim.pattern);
  if (!match) {
    failures.push(
      `${claim.label} (${claim.file}): no count matched ${claim.pattern}. If the wording changed, update scripts/check-generator-count.ts.`,
    );
    continue;
  }
  const claimed = Number(match[1]);
  if (claimed !== actual) {
    failures.push(
      `${claim.label} (${claim.file}): claims ${claimed}, lib/agents/generators/ has ${actual}.`,
    );
  }
}

if (failures.length > 0) {
  console.error(`Generator count is out of date (${actual} in lib/agents/generators/):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Generator count consistent: ${actual}.`);
