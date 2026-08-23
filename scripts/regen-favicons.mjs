/**
 * Regenerates app/icon.png, app/apple-icon.png, app/favicon.ico, and the
 * design/brand/favicon/ kit copies from design/brand/glyph/glyph-source.svg.
 *
 * design/brand/README.txt says this kit "was produced by a single script...
 * rerun the generator rather than patching individual PNGs," but that
 * original script isn't checked into this repo -- this fills the gap.
 *
 * Root cause this fixes: glyph-source.svg's viewBox is 96x118 (portrait --
 * the binder-clip handle extends above the sheet rectangle). Squaring that
 * into a fixed canvas by fitting to WIDTH crops the top of the handle loop
 * at small sizes, which is what a browser tab favicon actually renders.
 * sharp's `fit: "contain"` fits to the LARGER dimension instead, so the
 * whole glyph always stays inside the square with proportional padding on
 * the other axis -- no crop possible by construction, at any output size.
 *
 * Run: node scripts/regen-favicons.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

const SVG = readFileSync("design/brand/glyph/glyph-source.svg");
const BG = { r: 11, g: 11, b: 13, alpha: 1 }; // matches the current icon.png corner sample

// fit:'contain' guarantees the whole 96x118 glyph stays inside the square
// canvas with equal-proportioned padding, no edge crop -- the actual bug
// (top of the handle loop sitting too close to a naive width-fit crop).
async function squareIcon(size) {
  // ensureAlpha, not flatten: flatten drops the alpha channel entirely
  // (RGB, 3 channels), and Next.js's own ICO decoder rejects an embedded
  // PNG that isn't RGBA -- confirmed live, "The PNG is not in RGBA
  // format!" 500s every route. resize's own `background` already paints
  // the letterboxed margin opaque, so ensureAlpha just keeps a real (fully
  // opaque) 4th channel in the encoded PNG rather than removing it.
  return sharp(SVG, { density: 384 })
    .resize(size, size, { fit: "contain", background: BG })
    .ensureAlpha()
    .png()
    .toBuffer();
}

function packIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const dirEntries = [];
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += buf.length;
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

const [icon512, icon180, icon48, icon32, icon16] = await Promise.all(
  [512, 180, 48, 32, 16].map(squareIcon),
);

writeFileSync("app/icon.png", icon512);
writeFileSync("app/apple-icon.png", icon180);
writeFileSync("app/favicon.ico", packIco([icon16, icon32, icon48], [16, 32, 48]));

writeFileSync("design/brand/favicon/favicon-16.png", icon16);
writeFileSync("design/brand/favicon/favicon-32.png", icon32);
writeFileSync("design/brand/favicon/favicon-48.png", icon48);
writeFileSync("design/brand/favicon/favicon-512.png", icon512);
writeFileSync("design/brand/favicon/favicon.ico", packIco([icon16, icon32, icon48], [16, 32, 48]));

console.log("done");
