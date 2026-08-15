/**
 * Derive the dark hero frame from the day hero frame.
 *
 * WHY, rather than using the separately generated night image: two independent
 * text-to-image generations are never pixel-identical. Ours differed by 0.2%
 * scale and ~5px translation, which is a visible settle when the theme
 * toggles. Measuring and resampling reduces that to ~1px but never to zero,
 * and it has to be redone every time the art changes. Deriving the night frame
 * from the day frame makes the geometry identical BY CONSTRUCTION.
 *
 * THE MASK. A first attempt keyed off saturation and failed badly: the warm
 * cream walls carry roughly the same saturation as the glow, so the room
 * stayed lit, and the brightest line cores are blown out to near-white (which
 * is *desaturated*), so the glow itself went dark. Inverted on both counts.
 *
 * Hue separates them cleanly instead. The quote-lines are cyan and violet, so
 * blue exceeds red; every other surface in the room is warm, so red exceeds
 * blue. `b - r` is therefore a near-perfect discriminator. The mask is then
 * blurred so a blown-out white core inherits the coolness of the halo around
 * it, which is what makes the lines read as emitting rather than as outlines.
 *
 *   node scripts/make-hero-dark.cjs
 */
const path = require("path");
const sharp = require("sharp");

const PUBLIC = path.join(__dirname, "..", "public");
const SRC = path.join(PUBLIC, "hero-day.png");
const OUT = path.join(PUBLIC, "hero-dark.png");

// Warm charcoal the frame is pulled toward. Brand rule: never blue-black.
const NIGHT = { r: 0x16, g: 0x18, b: 0x1b };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

(async () => {
  const img = sharp(SRC).removeAlpha();
  const { width, height } = await img.metadata();
  const { data } = await img.raw().toBuffer({ resolveWithObject: true });
  const px = width * height;

  // ---- pass 1: cool mask, keyed on hue --------------------------------------
  const cool = Buffer.allocUnsafe(px);
  for (let i = 0, p = 0; p < px; i += 3, p++) {
    const r = data[i];
    const b = data[i + 2];
    // >0 only where blue leads red, i.e. the cyan/violet glow
    cool[p] = Math.round(clamp01((b - r) / 45) * 255);
  }

  // Blur so blown-out white cores pick up the coolness of their own halo.
  const coolBlur = await sharp(cool, { raw: { width, height, channels: 1 } })
    .blur(2.5)
    .raw()
    .toBuffer();

  // ---- pass 2: grade --------------------------------------------------------
  const out = Buffer.allocUnsafe(data.length);
  for (let i = 0, p = 0; p < px; i += 3, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const y = Math.floor(p / width) / height;

    // Emissive: cool hue AND some brightness. Take the stronger of the sharp
    // and blurred masks so thin lines keep their edge while cores fill in.
    const coolness = Math.max(cool[p], coolBlur[p]) / 255;
    const neon = clamp01(coolness * clamp01(luma / 0.30));

    // The dome is the daylight source: at night it must go essentially black,
    // so it is excluded from the ambient floor that keeps sheets readable.
    const belowDome = clamp01((y - 0.28) / 0.14);
    const ambient = clamp01((luma - 0.26) / 0.6) * belowDome * 0.34;

    // Night base: deep darken, then pulled toward warm charcoal so the
    // shadows read warm rather than grey.
    const towardNight = 0.45;
    const nr = r * 0.14 * (1 - towardNight) + NIGHT.r * towardNight;
    const ng = g * 0.14 * (1 - towardNight) + NIGHT.g * towardNight;
    const nb = b * 0.14 * (1 - towardNight) + NIGHT.b * towardNight;

    const lift = neon * 1.35 + ambient;

    out[i] = Math.min(255, Math.round(nr + r * lift));
    out[i + 1] = Math.min(255, Math.round(ng + g * lift));
    out[i + 2] = Math.min(255, Math.round(nb + b * lift * 1.06));
  }

  await sharp(out, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  console.log(`wrote ${path.relative(process.cwd(), OUT)}  (${width}x${height})`);
  console.log("geometry is identical to hero-day.png by construction");
})().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
