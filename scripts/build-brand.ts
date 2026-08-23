/**
 * Regenerates the raster derivatives of the Pepiros glyph from one source
 * SVG, per the approved plan's §4 ("every asset regenerates from one source
 * SVG through one script... the current kit has no generator, which is why
 * it has never been regenerated since the three commits that created it").
 *
 *   npm run build:brand
 *
 * SCOPE, STATED PLAINLY. This covers the assets that are pure geometric
 * derivatives of design/brand/glyph/glyph-source.svg: the glyph PNG set, the
 * favicon set (+ multi-res .ico), and the app-icon set (android, maskable,
 * apple-touch, mstile). Those had a real, root-cause reason to be
 * script-generated: nothing produced them before, so every one of the ~30
 * files was a separately hand-exported PNG that could silently drift from
 * the SVG they were supposed to be a rendering of.
 *
 * NOT covered by this script, and still hand-authored:
 *   - logos/ (the six lockup SVGs). These compose the glyph WITH the Geist
 *     wordmark at specific tracking and baseline offsets (see
 *     components/ui/Logo.tsx's own header comment for the exact figures) --
 *     that is a typesetting problem, not a raster-derivative one, and the
 *     four that exist were hand-verified against the kit's own spec this
 *     session. Regenerating them here risked introducing a regression
 *     against files already known correct, for a lower-value target.
 *   - og/, social/, posters/. Composed raster campaign material, not
 *     geometric derivatives -- same reasoning.
 *   - web/ (browserconfig.xml, the manifest icon snippet). Already static
 *     text, already correct as of the 2026-08-23 wiring-drift fixes; there
 *     is nothing here for a script to derive.
 *   - shader/ poster frames. These need a build-time GPU render pipeline
 *     (plan §9, via a separate Remotion project) that does not exist in this
 *     repo. Flagged as follow-up, not silently skipped.
 *
 * Extending this script to cover logos/og/social is the natural next step,
 * not a redesign of the approach here.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const BRAND_DIR = join(REPO_ROOT, "design", "brand");
const GLYPH_SOURCE = join(BRAND_DIR, "glyph", "glyph-source.svg");
const PUBLIC_APP_ICONS = join(REPO_ROOT, "public", "brand", "app-icons");

/**
 * The canonical geometry, restated here as a guard rather than trusted
 * blindly: if glyph-source.svg is ever hand-edited to a different sheet size
 * or rule count, this script should fail loudly rather than silently bake a
 * changed mark into every derived asset.
 *
 *   sheet   rect x=12 y=18 w=72 h=94 rx=2.5
 *   rules   y = 46, 57, 68, 79, 90 (x 22-74) + a short rule y=101 (x 22-52)
 *   clip    M39 15.5 H57 L59.5 33.5 H36.5 Z
 *   handle  M43 16 C43 6.5 45.2 3.4 48 3.4 C50.8 3.4 53 6.5 53 16
 */
const EXPECTED_MARKERS = [
  'x="12" y="18" width="72" height="94" rx="2.5"',
  'x1="22" y1="46" x2="74" y2="46"',
  'x1="22" y1="101" x2="52" y2="101"',
  "M39 15.5 H57 L59.5 33.5 H36.5 Z",
  "M43 16 C43 6.5 45.2 3.4 48 3.4 C50.8 3.4 53 6.5 53 16",
];

function assertCanonicalGeometry(svg: string) {
  const missing = EXPECTED_MARKERS.filter((marker) => !svg.includes(marker));
  if (missing.length > 0) {
    throw new Error(
      `glyph-source.svg no longer matches the canonical geometry documented in ` +
        `design/brand/README.txt and this script. Missing:\n${missing.map((m) => `  - ${m}`).join("\n")}\n` +
        `If the geometry changed intentionally, update EXPECTED_MARKERS here too.`,
    );
  }
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** design/brand/README.txt's flat-ink treatment: kit ink on a paper ground. */
const PAPER = "#FAF8F4";

/** Renders the glyph SVG to a square PNG at `size`, ink on transparent. */
async function glyphPng(svg: string, size: number, opts: { transparentGround?: boolean } = {}) {
  const source = opts.transparentGround ? svg.replace(`fill="${PAPER}"`, `fill="none"`) : svg;
  return sharp(Buffer.from(source), { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/**
 * Minimal, dependency-free multi-resolution .ico writer.
 *
 * A favicon.ico is just a directory header followed by N embedded images;
 * modern browsers accept PNG-compressed entries directly (no BMP re-encode
 * needed), so this only has to concatenate the PNGs we already rendered with
 * a correctly-computed ICONDIR/ICONDIRENTRY table in front of them.
 */
function buildIco(pngs: { size: number; data: Buffer }[]): Buffer {
  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + entrySize * pngs.length;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  const entries: Buffer[] = [];
  const images: Buffer[] = [];
  let offset = dirSize;

  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256 per the ICO spec
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // no palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    images.push(data);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

async function main() {
  console.log("[build-brand] reading", GLYPH_SOURCE);
  const source = readFileSync(GLYPH_SOURCE, "utf-8");
  assertCanonicalGeometry(source);

  // ---- glyph/ -------------------------------------------------------------
  const glyphDir = join(BRAND_DIR, "glyph");
  ensureDir(glyphDir);
  const glyphSizes = [64, 128, 256, 512, 1024];
  for (const size of glyphSizes) {
    const png = await glyphPng(source, size);
    writeFileSync(join(glyphDir, `glyph-${size}.png`), png);
  }
  console.log(`[build-brand] glyph/: ${glyphSizes.length} PNGs (${glyphSizes.join(", ")})`);

  // ---- favicon/ -------------------------------------------------------------
  const faviconDir = join(BRAND_DIR, "favicon");
  ensureDir(faviconDir);
  const faviconSizes = [16, 24, 32, 48, 64, 128, 256, 512];
  const faviconPngs: { size: number; data: Buffer }[] = [];
  for (const size of faviconSizes) {
    const data = await glyphPng(source, size);
    writeFileSync(join(faviconDir, `favicon-${size}.png`), data);
    faviconPngs.push({ size, data });
  }
  // The .ico embeds the classic tray sizes only -- a 512px frame inside an
  // .ico is dead weight no consumer of that format reads at that size.
  const icoSizes = new Set([16, 32, 48]);
  const ico = buildIco(faviconPngs.filter((p) => icoSizes.has(p.size)));
  writeFileSync(join(faviconDir, "favicon.ico"), ico);
  console.log(`[build-brand] favicon/: ${faviconSizes.length} PNGs + favicon.ico`);

  // safari-pinned-tab.svg: Safari's single-colour mask format. Every FILLED
  // or STROKED area becomes part of the visible silhouette; anything left
  // unpainted is masked out. The sheet's paper fill must therefore become
  // `none`, not black -- filling it black would make the whole rounded
  // rectangle one solid mask with the rule lines invisibly stacked on top of
  // it, rather than a page outline with lines inside it. Only the sheet's
  // STROKE (its outline) and the ink marks (rules, clip, handle) should
  // become the mask colour.
  //
  // Caught by opening the rendered SVG and reading it back, not by
  // inspection of the substitution list alone -- the first version of this
  // recolored the paper fill to black too and produced a solid black
  // rounded rectangle instead of a recognisable glyph.
  const pinnedTab = source
    .replace(/fill="#FAF8F4"/g, 'fill="none"')
    .replace(/stroke="#181511"/g, 'stroke="#000000"')
    .replace(/fill="#181511"/g, 'fill="#000000"')
    .replace(/stroke="#8A8374"/g, 'stroke="#000000"');
  writeFileSync(join(faviconDir, "safari-pinned-tab.svg"), pinnedTab);

  // ---- app-icons/ -----------------------------------------------------------
  const appIconsDir = join(BRAND_DIR, "app-icons");
  ensureDir(appIconsDir);

  const android192 = await glyphPng(source, 192);
  const android512 = await glyphPng(source, 512);
  writeFileSync(join(appIconsDir, "android-192.png"), android192);
  writeFileSync(join(appIconsDir, "android-512.png"), android512);

  // Maskable: Android crops a square icon into whatever mask shape the
  // launcher uses (circle, squircle, rounded square...), so anything near the
  // edge of a naive square export gets clipped. The fix is to render the
  // glyph into roughly the inner 80% "safe zone" of the canvas, on an OPAQUE
  // ground (a maskable icon must have no transparency, or the mask shows
  // whatever is behind it through the corners).
  const maskableGlyph = await sharp(Buffer.from(source), { density: 300 })
    .resize(Math.round(512 * 0.72), Math.round(512 * 0.72), {
      fit: "contain",
      // sharp's default letterbox fill for "contain" is OPAQUE BLACK when no
      // background is given, not transparent -- omitting this produced two
      // solid black bars either side of the glyph (its 96x118 source is
      // taller than the square target, so contain-fit pads left/right).
      // Caught by actually opening the rendered PNG, not by the type or
      // shape of the call.
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const maskable512 = await sharp({
    create: { width: 512, height: 512, channels: 4, background: PAPER },
  })
    .composite([{ input: maskableGlyph, gravity: "center" }])
    .png()
    .toBuffer();
  writeFileSync(join(appIconsDir, "maskable-512.png"), maskable512);

  // Foreground: the glyph alone, transparent ground, for launchers that
  // composite their own background layer (Android adaptive icons).
  const foreground512 = await glyphPng(source, 512, { transparentGround: true });
  writeFileSync(join(appIconsDir, "foreground-512.png"), foreground512);
  // "Trimmed": same render, cropped to the glyph's actual ink bounds rather
  // than the full 512 canvas, for placements that do their own centring.
  const foregroundTrimmed = await sharp(foreground512).trim().png().toBuffer();
  writeFileSync(join(appIconsDir, "foreground-512-trimmed.png"), foregroundTrimmed);

  const appleTouch = await glyphPng(source, 180);
  writeFileSync(join(appIconsDir, "apple-touch-180.png"), appleTouch);

  const mstile = await glyphPng(source, 150);
  writeFileSync(join(appIconsDir, "mstile-150.png"), mstile);

  console.log("[build-brand] app-icons/: android 192/512, maskable-512, foreground-512(+trimmed), apple-touch-180, mstile-150");

  // ---- sync into public/, which is what the app actually serves ----------
  // design/brand/ is source material; public/ is the deploy artifact. See
  // app/manifest.ts's own comment on why these specific two are served from
  // public/ rather than through Next's icon.tsx/apple-icon.tsx convention.
  ensureDir(PUBLIC_APP_ICONS);
  writeFileSync(join(PUBLIC_APP_ICONS, "android-192.png"), android192);
  writeFileSync(join(PUBLIC_APP_ICONS, "android-512.png"), android512);
  writeFileSync(join(PUBLIC_APP_ICONS, "maskable-512.png"), maskable512);
  console.log("[build-brand] synced android/maskable icons into public/brand/app-icons/");

  console.log("[build-brand] done. logos/, og/, social/, posters/, web/ are unchanged -- see the file header for why.");
}

main().catch((err) => {
  console.error("[build-brand] failed:", err);
  process.exitCode = 1;
});
