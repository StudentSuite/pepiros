/**
 * Convert the hero art to WebP.
 *
 * The source PNGs are ~2.3MB and ~1.5MB. Both are rendered on every page load
 * (the crossfade needs both decoded so the theme toggle does not pop), so that
 * is ~3.8MB of hero on first paint. WebP at q82 cuts it by roughly 80% with no
 * visible difference on photographic art like this.
 *
 * The PNGs are kept as the source of truth: scripts/make-hero-dark.cjs derives
 * hero-dark from hero-day, and re-deriving from a lossy file would compound.
 *
 *   node scripts/optimize-hero.cjs
 */
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const PUBLIC = path.join(__dirname, "..", "public");

(async () => {
  for (const name of ["hero-day", "hero-dark"]) {
    const src = path.join(PUBLIC, `${name}.png`);
    const out = path.join(PUBLIC, `${name}.webp`);
    if (!fs.existsSync(src)) {
      console.error(`missing ${name}.png, skipping`);
      continue;
    }
    await sharp(src).webp({ quality: 82, effort: 5 }).toFile(out);
    const before = fs.statSync(src).size;
    const after = fs.statSync(out).size;
    console.log(
      `${name}: ${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB ` +
        `(${Math.round((1 - after / before) * 100)}% smaller)`,
    );
  }
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
