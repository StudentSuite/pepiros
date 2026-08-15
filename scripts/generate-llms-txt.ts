// Regenerates the one line in public/llms.txt that names the registered MCP
// tools, from lib/mcp/registry.ts -- the same registry mcp/tools/index.ts's
// registrations are tested against (lib/mcp/registry.test.ts). Run with
// `npm run generate:llms` after changing the tool registry.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LIVE_TOOL_NAMES, PLANNED_TOOL_NAMES, numberWord as lowercaseNumberWord } from "@/lib/mcp/registry";

const LLMS_TXT_PATH = path.join(process.cwd(), "public", "llms.txt");
const LINE_PREFIX = "- Connect over MCP (see [/mcp](/mcp)).";

/** Sentence case for this file's copy ("Twelve tools..."); the registry's own helper is lowercase. */
function numberWord(n: number): string {
  const word = lowercaseNumberWord(n);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function joinBacktickList(names: string[]): string {
  const quoted = names.map((n) => `\`${n}\``);
  if (quoted.length <= 1) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")}, and ${quoted.at(-1)}`;
}

function buildLine(): string {
  const liveList = joinBacktickList(LIVE_TOOL_NAMES);
  const liveSentence = `${numberWord(LIVE_TOOL_NAMES.length)} tools are registered today: ${liveList}.`;
  const plannedSentence =
    PLANNED_TOOL_NAMES.length > 0
      ? ` ${numberWord(PLANNED_TOOL_NAMES.length)} more (${joinBacktickList(PLANNED_TOOL_NAMES)}) ${PLANNED_TOOL_NAMES.length === 1 ? "is" : "are"} designed but not yet available; calling ${PLANNED_TOOL_NAMES.length === 1 ? "it" : "them"} will fail.`
      : "";
  return `${LINE_PREFIX} ${liveSentence}${plannedSentence}`;
}

const content = readFileSync(LLMS_TXT_PATH, "utf8");
const lines = content.split("\n");
const targetIndex = lines.findIndex((line) => line.startsWith(LINE_PREFIX));
if (targetIndex === -1) {
  throw new Error(`Could not find a line starting with "${LINE_PREFIX}" in public/llms.txt to regenerate.`);
}

lines[targetIndex] = buildLine();
writeFileSync(LLMS_TXT_PATH, lines.join("\n"));
console.log(`Regenerated public/llms.txt's tool line:\n${lines[targetIndex]}`);
