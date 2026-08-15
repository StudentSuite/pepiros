/**
 * Layout audit: find text that overflows, is clipped, or escapes the viewport.
 *
 * Catches the three failures that look like "bad boundaries" in a screenshot but
 * are hard to spot by eye across dozens of routes:
 *
 *   1. HORIZONTAL PAGE OVERFLOW  document wider than the viewport, which shows
 *      up as a stray horizontal scrollbar.
 *   2. CLIPPED TEXT              an element whose content is taller or wider
 *      than its box while overflow is hidden, i.e. text silently cut off.
 *   3. ESCAPING CHILD            an element whose right edge sits outside its
 *      nearest clipping ancestor.
 *
 * Runs every route in both themes and at three widths, because most of these
 * only appear at one breakpoint.
 *
 *   node scripts/audit-overflow.cjs [baseUrl]
 */
const { chromium } = require("playwright");

const BASE = process.argv[2] || "http://localhost:3111";

const ROUTES = [
  "/",
  "/how-it-works",
  "/mcp",
  "/about",
  "/contact",
  "/legal",
  "/privacy",
  "/terms",
  "/security",
  "/status",
  "/docs",
  "/faq",
  "/roadmap",
  "/changelog",
  "/discover",
  "/login",
  "/signup",
  "/home",
  "/analytics",
  "/posts",
  "/comments",
  "/settings/profile",
  "/settings/security",
  "/settings/mcp-tokens",
  "/settings/notifications",
  "/onboarding/1",
  "/onboarding/4",
  "/upload",
  "/workspaces",
];

const WIDTHS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const PROBE = () => {
  const problems = [];
  const doc = document.documentElement;

  if (doc.scrollWidth > window.innerWidth + 1) {
    problems.push({
      kind: "page-overflow",
      detail: `document ${doc.scrollWidth}px wide vs viewport ${window.innerWidth}px`,
      selector: "html",
    });
  }

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const clipsX = cs.overflowX === "hidden" || cs.overflowX === "clip";
    const clipsY = cs.overflowY === "hidden" || cs.overflowY === "clip";

    // 2. clipped text. Ignore elements that deliberately truncate.
    const truncates =
      cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none";
    if (!truncates) {
      if (clipsX && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        problems.push({
          kind: "clipped-x",
          detail: `content ${el.scrollWidth}px in a ${el.clientWidth}px box`,
          selector: describe(el),
          text: (el.textContent || "").trim().slice(0, 60),
        });
      }
      if (clipsY && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
        problems.push({
          kind: "clipped-y",
          detail: `content ${el.scrollHeight}px in a ${el.clientHeight}px box`,
          selector: describe(el),
          text: (el.textContent || "").trim().slice(0, 60),
        });
      }
    }

    // 3. escaping the viewport horizontally
    if (rect.right > window.innerWidth + 2 || rect.left < -2) {
      const fixed = cs.position === "fixed";
      if (!fixed) {
        problems.push({
          kind: "escapes-viewport",
          detail: `left ${Math.round(rect.left)} right ${Math.round(rect.right)} vs ${window.innerWidth}`,
          selector: describe(el),
          text: (el.textContent || "").trim().slice(0, 60),
        });
      }
    }
  }

  // de-duplicate by selector+kind, keep first
  const seen = new Set();
  return problems.filter((p) => {
    const k = `${p.kind}|${p.selector}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // sign in so the authed routes render
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "guest", password: "guest" }),
    });
  });

  const findings = [];

  for (const theme of ["light", "dark"]) {
    for (const vp of WIDTHS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ROUTES) {
        try {
          await page.goto(`${BASE}${route}`, {
            waitUntil: "networkidle",
            timeout: 20000,
          });
        } catch {
          continue;
        }
        await page.evaluate((t) => {
          document.documentElement.classList.toggle("dark", t === "dark");
        }, theme);
        await page.waitForTimeout(120);

        const problems = await page.evaluate(PROBE);
        for (const p of problems) {
          findings.push({ route, theme, vp: vp.name, ...p });
        }
      }
    }
  }

  await browser.close();

  if (findings.length === 0) {
    console.log("no layout problems found");
    return;
  }

  const byKind = {};
  for (const f of findings) (byKind[f.kind] ||= []).push(f);

  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`\n=== ${kind} (${list.length}) ===`);
    for (const f of list.slice(0, 25)) {
      console.log(
        `  ${f.route} [${f.theme}/${f.vp}] ${f.selector}\n     ${f.detail}${f.text ? `\n     text: ${JSON.stringify(f.text)}` : ""}`,
      );
    }
    if (list.length > 25) console.log(`  ... and ${list.length - 25} more`);
  }
  console.log(`\ntotal: ${findings.length}`);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
